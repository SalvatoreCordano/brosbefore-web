// SupabaseRepo: datos reales en Postgres (con RLS) y accesos con Supabase Auth.
// Reutiliza las reglas de negocio de DbRepo: cada cambio se aplica en memoria y después se
// sincroniza con la base solo lo que cambió (upsert/delete por tabla).
// shortcut: la base vive en caché en memoria; si dos admins editan a la vez, el último en guardar gana.
// Cuando eso sea un problema, refrescar `load()` antes de cada escritura o usar Realtime.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Couple, Db, Member, PresentationContent, Testimonial } from "./types";
import { DbRepo, now, uid, type NewFile, type Session } from "./repo";
import { MockStorage, mediaUrls, setStorage, storage } from "./storage";
import { R2Storage } from "./r2-storage";

type Row = Record<string, any>;

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** objeto → fila (solo las claves de primer nivel; los jsonb se guardan tal cual) */
const rowOf = (o: object, omit: string[] = []): Row =>
  Object.fromEntries(
    Object.entries(o)
      .filter(([k]) => !omit.includes(k))
      .map(([k, v]) => [toSnake(k), v === undefined ? null : v])
  );

/** fila → objeto; los campos opcionales del modelo vuelven a ser `undefined` en vez de `null` */
const objOf = <T>(r: Row, optional: string[] = []): T =>
  Object.fromEntries(
    Object.entries(r).map(([k, v]) => {
      const key = toCamel(k);
      return [key, v === null && optional.includes(key) ? undefined : v];
    })
  ) as T;

const FILE_OPTIONAL = ["externalUrl", "poster", "width", "height", "durationSec", "sizeBytes", "takenAt"];
const MEMBER_COLS = "id,couple_id,email,name,status,invited_at,invite_token"; // sin user_id

/** Tablas en orden padre → hijo (los upserts van en este orden y los deletes al revés). */
interface Spec {
  table: string;
  key: string[];
  select?: string;
  rows: (db: Db) => Row[];
}
const SPECS: Spec[] = [
  { table: "plans", key: ["id"], rows: (db) => db.plans.map((x) => rowOf(x)) },
  { table: "tags", key: ["id"], rows: (db) => db.tags.map((x) => rowOf(x)) },
  { table: "couples", key: ["id"], rows: (db) => db.couples.map((x) => rowOf(x)) },
  { table: "coverages", key: ["id"], rows: (db) => db.coverages.map((x) => rowOf(x)) },
  { table: "moments", key: ["id"], rows: (db) => db.moments.map((x) => rowOf(x)) },
  { table: "files", key: ["id"], rows: (db) => db.files.map((x) => rowOf(x)) },
  { table: "public_profiles", key: ["couple_id"], rows: (db) => db.publicProfiles.map((x) => rowOf(x)) },
  { table: "public_items", key: ["id"], rows: (db) => db.publicItems.map((x) => rowOf(x)) },
  { table: "presentations", key: ["couple_id"], rows: (db) => db.presentations.map((x) => rowOf(x, ["published"])) },
  {
    table: "presentation_published",
    key: ["couple_id"],
    rows: (db) =>
      db.presentations
        .filter((p) => p.published)
        .map((p) => ({ couple_id: p.coupleId, content: p.published, published_at: p.publishedAt })),
  },
  { table: "pres_items", key: ["id"], rows: (db) => db.presItems.map((x) => rowOf(x)) },
  { table: "couple_tags", key: ["couple_id", "tag_id"], rows: (db) => db.coupleTags.map((x) => rowOf(x)) },
  {
    table: "members",
    key: ["id"],
    select: MEMBER_COLS,
    rows: (db) => db.members.map((x) => rowOf(x, ["passwordHash"])),
  },
  { table: "testimonials", key: ["id"], rows: (db) => db.testimonials.map((x) => rowOf(x)) },
];

const sig = (r: Row) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k]]));
const keyOf = (spec: Spec, r: Row) => spec.key.map((k) => String(r[k])).join("|");
const chunks = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
const PAGE = 1000; // tope de filas por consulta en Supabase

const fail = (e: { message: string } | null) => {
  if (e) throw new Error(e.message);
};

/** Fotos cuya copia ligera debe estar en el bucket público: las de la galería/portafolio, portadas y banners de parejas visibles. */
export function publicKeys(db: Db): Set<string> {
  const open = new Set(db.couples.filter((c) => c.inGallery && !c.deletedAt).map((c) => c.id));
  const coupleOf = new Map(db.coverages.map((c) => [c.id, c.coupleId]));
  const ids = new Set<string>();
  db.publicItems.forEach((i) => open.has(coupleOf.get(i.coverageId) ?? "") && ids.add(i.fileId));
  db.publicProfiles
    .filter((p) => open.has(p.coupleId))
    .forEach((p) => [p.coverFileId, p.banner?.fileId].forEach((id) => id && ids.add(id)));
  return new Set(db.files.filter((f) => ids.has(f.id) && f.kind === "photo" && f.storageKey.startsWith("o/")).map((f) => f.storageKey));
}

export class SupabaseRepo extends DbRepo {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;
  private cache: Promise<Db> | null = null;
  private sessionCache: Promise<Session | null> | null = null;
  private userId: string | null | undefined;
  private r2: R2Storage | null = null;

  /** `client` solo se pasa en las pruebas; `apiUrl` es el Worker de archivos (R2) */
  constructor(url: string, anonKey: string, client?: SupabaseClient, apiUrl?: string) {
    super();
    this.sb = client ?? createClient(url, anonKey, { auth: { detectSessionInUrl: false } });
    if (apiUrl) {
      const r2 = (this.r2 = new R2Storage({ api: apiUrl, token: async () => (await this.sb.auth.getSession()).data.session?.access_token ?? null }));
      setStorage(r2);
      mediaUrls.useSigner((keys) => r2.sign(keys));
    }
    if (typeof window !== "undefined") mediaUrls.subscribe(() => this.emit()); // llegó un enlace firmado: repintar
    this.sb.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id === this.userId) return; // renovar el token no cambia nada
      const first = this.userId === undefined;
      this.userId = id;
      mediaUrls.forgetSigned(); // los enlaces firmados eran de la sesión anterior
      // lo que se ve depende de quién entró: se vuelve a leer todo
      this.cache = null;
      this.sessionCache = null;
      if (!first || id) this.emit();
    });
  }

  // ---------- lectura ----------
  protected load() {
    return (this.cache ??= this.fetchAll().catch((e) => {
      this.cache = null;
      throw e;
    }));
  }
  protected setCache(db: Db) {
    this.cache = Promise.resolve(db);
  }

  private async fetchTable(table: string, select = "*", order = "id"): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.sb
        .from(table)
        .select(select)
        .order(order)
        .range(from, from + PAGE - 1);
      fail(error);
      out.push(...((data ?? []) as unknown as Row[]));
      if (!data || data.length < PAGE) return out;
    }
  }

  private async fetchAll(): Promise<Db> {
    await this.sb.auth.getSession(); // espera a recuperar la sesión guardada antes de leer
    const t = (spec: Spec) => this.fetchTable(spec.table, spec.select, spec.key[0]);
    const byTable = Object.fromEntries(SPECS.map((s) => [s.table, s]));
    const [
      plans, tags, couples, coverages, moments, files, profiles, publicItems,
      drafts, published, presItems, coupleTags, members, testimonials, publicTestimonials,
    ] = await Promise.all([
      ...["plans", "tags", "couples", "coverages", "moments", "files", "public_profiles", "public_items",
        "presentations", "presentation_published", "pres_items", "couple_tags", "members", "testimonials"]
        .map((n) => t(byTable[n])),
      this.fetchTable("testimonials_public"),
    ]);

    const pubByCouple = new Map(published.map((r) => [r.couple_id as string, r]));
    const presentations = drafts.map((r) => {
      const pub = pubByCouple.get(r.couple_id);
      return { ...objOf<any>(r), published: pub ? pub.content : null };
    });
    // la pareja no ve el borrador: arma la presentación a partir de lo publicado
    for (const pub of published.filter((r) => !drafts.some((d) => d.couple_id === r.couple_id))) {
      const c = pub.content as PresentationContent;
      presentations.push({
        coupleId: pub.couple_id, banner: c.banner, songKey: c.songKey, songName: c.songName,
        message: c.message, messageSignature: c.messageSignature,
        publishedAt: pub.published_at, published: pub.content, updatedAt: pub.published_at ?? "",
      });
    }
    // agradecimientos republicados que ve el público (sin el texto original)
    const known = new Set(testimonials.map((r) => r.id));
    const publicOnes: Testimonial[] = publicTestimonials
      .filter((r) => !known.has(r.id))
      .map((r) => ({
        id: r.id, coupleId: r.couple_id, memberId: "", originalText: "",
        publishedText: r.published_text, reposted: true, updatedAt: r.updated_at,
      }));

    return {
      version: 0,
      plans: plans.map((r) => objOf<any>(r)).sort((a, b) => a.priceFrom - b.priceFrom),
      tags: tags.map((r) => objOf<any>(r)),
      couples: couples.map((r) => objOf<Couple>(r)),
      coverages: coverages.map((r) => objOf<any>(r)),
      moments: moments.map((r) => objOf<any>(r)),
      files: files.map((r) => objOf<any>(r, FILE_OPTIONAL)),
      publicProfiles: profiles.map((r) => objOf<any>(r, ["coverPosition"])),
      publicItems: publicItems.map((r) => objOf<any>(r)),
      presentations,
      presItems: presItems.map((r) => objOf<any>(r)),
      coupleTags: coupleTags.map((r) => objOf<any>(r)),
      members: members.map((r) => ({ ...objOf<Member>(r), passwordHash: null })),
      testimonials: [...testimonials.map((r) => objOf<Testimonial>(r)), ...publicOnes],
    };
  }

  // ---------- escritura ----------
  protected async commit(prev: Db, next: Db) {
    try {
      const removed: [Spec, Row[]][] = [];
      for (const spec of SPECS) {
        const before = new Map(spec.rows(prev).map((r) => [keyOf(spec, r), r]));
        const after = spec.rows(next);
        const afterKeys = new Set(after.map((r) => keyOf(spec, r)));
        const changed = after.filter((r) => {
          const old = before.get(keyOf(spec, r));
          return !old || sig(old) !== sig(r);
        });
        for (const part of chunks(changed, 500)) {
          const { error } = await this.sb.from(spec.table).upsert(part, { onConflict: spec.key.join(",") });
          fail(error);
        }
        removed.push([spec, [...before].filter(([k]) => !afterKeys.has(k)).map(([, r]) => r)]);
      }
      for (const [spec, rows] of removed.reverse()) {
        if (spec.key.length === 1) {
          for (const part of chunks(rows.map((r) => r[spec.key[0]]), 100)) {
            const { error } = await this.sb.from(spec.table).delete().in(spec.key[0], part);
            fail(error);
          }
        } else {
          for (const r of rows) {
            const { error } = await this.sb.from(spec.table).delete().match(Object.fromEntries(spec.key.map((k) => [k, r[k]])));
            fail(error);
          }
        }
      }
      await this.syncPublicCopies(prev, next);
    } catch (e) {
      this.cache = null; // pudo quedar guardado a medias: se vuelve a leer la base real
      throw e;
    }
  }

  /** La web pública lee copias ligeras desde un bucket aparte: se crean al elegir una foto y se quitan al soltarla. */
  private async syncPublicCopies(prev: Db, next: Db) {
    if (!this.r2) return;
    const before = publicKeys(prev);
    const after = publicKeys(next);
    const add = [...after].filter((k) => !before.has(k));
    const gone = [...before].filter((k) => !after.has(k));
    if (add.length || gone.length) await this.r2.syncPublic(add, gone);
  }

  async addFiles(coverageId: string, files: NewFile[], onProgress?: (done: number) => void) {
    this.requireRealStorage();
    return super.addFiles(coverageId, files, onProgress);
  }
  async uploadAsset(blob: Blob) {
    this.requireRealStorage();
    return super.uploadAsset(blob);
  }
  private requireRealStorage() {
    // sin el Worker de archivos (NEXT_PUBLIC_API_URL) los archivos quedarían guardados solo en este navegador
    if (storage instanceof MockStorage) throw new Error("La subida de archivos no está conectada (falta NEXT_PUBLIC_API_URL).");
  }

  async resetDemo() {
    throw new Error("No disponible con datos reales.");
  }

  // ---------- portal de la pareja ----------
  private async uidNow() {
    return (await this.sb.auth.getSession()).data.session?.user.id ?? null;
  }

  getSession() {
    return (this.sessionCache ??= this.readSession());
  }
  private async readSession(): Promise<Session | null> {
    const id = await this.uidNow();
    if (!id) return null;
    const { data: m, error } = await this.sb.from("members").select(MEMBER_COLS).eq("user_id", id).eq("status", "active").maybeSingle();
    fail(error);
    if (!m) return null;
    const { data: c } = await this.sb.from("couples").select("*").eq("id", m.couple_id).maybeSingle();
    return c ? { member: { ...objOf<Member>(m), passwordHash: null }, couple: objOf<Couple>(c) } : null;
  }

  async getInvite(token: string) {
    const { data, error } = await this.sb.rpc("get_invite", { p_token: token });
    fail(error);
    return (data as { email: string; names: string }[] | null)?.[0] ?? null;
  }

  async registerWithInvite(token: string, name: string, password: string) {
    if (!name.trim()) throw new Error("Escribe tu nombre");
    if (password.length < 8) throw new Error("La contraseña necesita al menos 8 caracteres");
    const invite = await this.getInvite(token);
    if (!invite) throw new Error("Esta invitación ya no es válida. Pide una nueva a brosbefore.");
    const email = invite.email;

    const up = await this.sb.auth.signUp({ email, password });
    if (up.error) {
      // la cuenta ya existía (otra invitación o una anterior): entra con esa contraseña
      const inn = await this.sb.auth.signInWithPassword({ email, password });
      if (inn.error) {
        throw new Error("Ya existe una cuenta con ese correo. Entra con tu contraseña o usa «Olvidé mi contraseña».");
      }
    } else if (!up.data.session) {
      throw new Error("La cuenta pide confirmar el correo. Avisa a brosbefore para completar la configuración.");
    }
    const { error } = await this.sb.rpc("claim_invite", { p_token: token, p_name: name.trim() });
    if (error) {
      await this.sb.auth.signOut();
      throw new Error(/invitacion_invalida/.test(error.message) ? "Esta invitación ya no es válida. Pide una nueva a brosbefore." : error.message);
    }
    this.sessionCache = null;
    this.emit();
  }

  async login(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error("Correo o contraseña incorrectos");
    this.sessionCache = null;
    if (!(await this.getSession())) {
      await this.sb.auth.signOut();
      throw new Error("Esta cuenta no tiene acceso a ninguna historia. Pide una invitación a brosbefore.");
    }
  }

  async logout() {
    await this.sb.auth.signOut();
  }

  async writeTestimonial(text: string) {
    const session = await this.getSession();
    if (!session) throw new Error("Tu sesión terminó, vuelve a entrar");
    if (!text.trim()) throw new Error("Escribe tu agradecimiento");
    const { data: mine, error } = await this.sb.from("testimonials").select("id,reposted").eq("member_id", session.member.id).maybeSingle();
    fail(error);
    if (mine?.reposted) throw new Error("Tu agradecimiento ya está publicado y no se puede editar");
    const res = mine
      ? await this.sb.from("testimonials").update({ original_text: text.trim(), updated_at: now() }).eq("id", mine.id)
      : await this.sb.from("testimonials").insert({
          id: uid("tes"), couple_id: session.couple.id, member_id: session.member.id, original_text: text.trim(), updated_at: now(),
        });
    fail(res.error);
    this.cache = null;
    this.emit();
  }

  // ---------- admin ----------
  async getAdmin() {
    const id = await this.uidNow();
    if (!id) return null;
    const { data } = await this.sb.from("admins").select("user_id").eq("user_id", id).maybeSingle();
    const { data: u } = await this.sb.auth.getUser();
    return data ? { email: u.user?.email ?? "" } : null;
  }

  async adminLogin(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error("Correo o contraseña incorrectos");
    if (!(await this.getAdmin())) {
      await this.sb.auth.signOut();
      throw new Error("Esta cuenta no es de administrador.");
    }
  }

  async adminLogout() {
    await this.sb.auth.signOut();
  }
}
