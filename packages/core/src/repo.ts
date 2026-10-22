// Capa de datos. Todas las pantallas leen y escriben por aquí.
// `DbRepo` tiene las reglas de negocio una sola vez; cada implementación solo cambia cómo se guarda:
//   MockRepo (mock-repo.ts)         → datos de ejemplo + localStorage + archivos en IndexedDB
//   SupabaseRepo (supabase-repo.ts) → Postgres con RLS + login de Supabase
// `repo` (instance.ts) elige una según las variables de entorno.
import type {
  Couple,
  CoverageType,
  Db,
  Id,
  MediaFile,
  MediaKind,
  Member,
  PortalStatus,
  PresItemRole,
  PresentationContent,
  PublicProfile,
  PublicScope,
} from "./types";
import { mediaUrls, storage } from "./storage";

export interface NewFile {
  momentName: string;
  blob: Blob;
  name: string;
  kind: MediaKind;
  width?: number;
  height?: number;
  durationSec?: number;
  takenAt?: string;
}

export interface Session {
  member: Member;
  couple: Couple;
}

export interface InviteLink {
  email: string;
  token: string;
}

export interface Repo {
  /** "mock": datos de ejemplo en el navegador. "supabase": datos y accesos reales. */
  readonly mode: "mock" | "supabase";
  getDb(): Promise<Db>;
  subscribe(listener: () => void): () => void;
  resetDemo(): Promise<void>;

  // ---- parejas ----
  createCouple(names: string): Promise<Id>;
  updateCouple(id: Id, patch: Partial<Pick<Couple, "names" | "slug" | "planId" | "location" | "weddingDate">>): Promise<void>;
  setCoverages(coupleId: Id, types: CoverageType[]): Promise<void>;
  updateCoverage(id: Id, patch: { date?: string; location?: string }): Promise<void>;
  setCoupleVisibility(coupleId: Id, patch: { inGallery?: boolean; inPortfolio?: boolean }): Promise<void>;
  reorderPortfolio(coupleIds: Id[]): Promise<void>;
  setPortalStatus(coupleId: Id, status: PortalStatus): Promise<void>;
  deleteCouple(coupleId: Id): Promise<void>;

  // ---- archivos ----
  addFiles(coverageId: Id, files: NewFile[], onProgress?: (done: number) => void): Promise<number>;
  renameMoment(id: Id, name: string): Promise<void>;
  moveMoment(id: Id, dir: -1 | 1): Promise<void>;
  deleteMoment(id: Id): Promise<void>;
  moveFile(fileId: Id, toMomentId: Id): Promise<void>;
  shiftFile(fileId: Id, dir: -1 | 1): Promise<void>;
  deleteFile(fileId: Id): Promise<void>;
  publishFiles(coupleId: Id): Promise<void>;
  uploadAsset(blob: Blob): Promise<string>;

  // ---- presentación (portal) ----
  updatePresentation(coupleId: Id, patch: Partial<PresentationContent>): Promise<void>;
  setPresItems(coverageId: Id, role: PresItemRole, fileIds: Id[]): Promise<void>;
  publishPresentation(coupleId: Id): Promise<void>;

  // ---- ficha pública ----
  updatePublicProfile(coupleId: Id, patch: Partial<Omit<PublicProfile, "coupleId">>): Promise<void>;
  setCoverageFlags(coverageId: Id, patch: { showInGallery?: boolean; showInPortfolio?: boolean }): Promise<void>;
  setPublicItems(coverageId: Id, scope: PublicScope, fileIds: Id[]): Promise<void>;
  setTags(coupleId: Id, names: string[]): Promise<void>;

  // ---- agradecimientos ----
  repostTestimonial(id: Id, text: string): Promise<void>;
  unrepostTestimonial(id: Id): Promise<void>;

  // ---- acceso ----
  saveMember(coupleId: Id, email: string, memberId?: Id): Promise<Id>;
  removeMember(memberId: Id): Promise<void>;
  sendInvites(coupleId: Id): Promise<InviteLink[]>;
  resendInvite(memberId: Id): Promise<InviteLink>;
  revokeMember(memberId: Id): Promise<void>;

  // ---- portal de la pareja ----
  getSession(): Promise<Session | null>;
  getInvite(token: string): Promise<{ email: string; names: string } | null>;
  registerWithInvite(token: string, name: string, password: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  writeTestimonial(text: string): Promise<void>;

  // ---- sesión del admin ----
  getAdmin(): Promise<{ email: string } | null>;
  adminLogin(email: string, password: string): Promise<void>;
  adminLogout(): Promise<void>;
}

export const now = () => new Date().toISOString();
export const uid = (p: string) => `${p}_${crypto.randomUUID().slice(0, 8)}`;
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export async function hashPassword(email: string, password: string) {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- consultas internas ----------
const momentIdsOfCoverage = (db: Db, coverageId: Id) =>
  new Set(db.moments.filter((m) => m.coverageId === coverageId).map((m) => m.id));
const coverageOfFile = (db: Db, f: MediaFile) => db.moments.find((m) => m.id === f.momentId)?.coverageId;
export const filesOfCouple = (db: Db, coupleId: Id) => {
  const cov = new Set(db.coverages.filter((c) => c.coupleId === coupleId).map((c) => c.id));
  const moments = new Set(db.moments.filter((m) => cov.has(m.coverageId)).map((m) => m.id));
  return db.files.filter((f) => moments.has(f.momentId));
};

export abstract class DbRepo implements Repo {
  abstract readonly mode: "mock" | "supabase";
  protected listeners = new Set<() => void>();
  private lock: Promise<unknown> = Promise.resolve();

  /** la base completa (puede tardar la primera vez); se cachea en memoria */
  protected abstract load(): Promise<Db>;
  protected abstract setCache(db: Db): void;
  /** guarda lo que cambió entre `prev` y `next`; si falla, la operación se revierte */
  protected abstract commit(prev: Db, next: Db): Promise<void>;
  protected async afterCoupleDeleted(): Promise<void> {}

  abstract resetDemo(): Promise<void>;
  abstract getSession(): Promise<Session | null>;
  abstract getInvite(token: string): Promise<{ email: string; names: string } | null>;
  abstract registerWithInvite(token: string, name: string, password: string): Promise<void>;
  abstract login(email: string, password: string): Promise<void>;
  abstract logout(): Promise<void>;
  abstract writeTestimonial(text: string): Promise<void>;
  abstract getAdmin(): Promise<{ email: string } | null>;
  abstract adminLogin(email: string, password: string): Promise<void>;
  abstract adminLogout(): Promise<void>;

  protected emit() {
    this.listeners.forEach((l) => l());
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async getDb() {
    return structuredClone(await this.load());
  }

  /** Aplica un cambio sobre una copia, lo guarda y recién entonces lo deja visible. Una a la vez. */
  protected tx<T>(fn: (db: Db) => T): Promise<T> {
    const run = async () => {
      const prev = await this.load();
      const next = structuredClone(prev);
      const result = fn(next);
      await this.commit(prev, next);
      this.setCache(next);
      this.emit();
      return result;
    };
    const p = this.lock.then(run, run);
    this.lock = p.catch(() => {});
    return p;
  }

  private couple(db: Db, id: Id) {
    const c = db.couples.find((x) => x.id === id);
    if (!c) throw new Error("Pareja no encontrada");
    return c;
  }

  /** borra archivos y todo lo que los referencia (selecciones, portadas, banners) */
  private dropFiles(db: Db, ids: Set<Id>) {
    if (!ids.size) return;
    const keys = db.files.filter((f) => ids.has(f.id)).map((f) => f.storageKey);
    db.files = db.files.filter((f) => !ids.has(f.id));
    db.publicItems = db.publicItems.filter((i) => !ids.has(i.fileId));
    db.presItems = db.presItems.filter((i) => !ids.has(i.fileId));
    db.presentations.forEach((p) => {
      if (p.banner?.fileId && ids.has(p.banner.fileId)) p.banner = null;
    });
    db.publicProfiles.forEach((p) => {
      if (p.coverFileId && ids.has(p.coverFileId)) p.coverFileId = null;
      if (p.banner?.fileId && ids.has(p.banner.fileId)) p.banner = null;
    });
    // los archivos ya publicados en la presentación siguen hasta que se vuelva a publicar
    void storage.remove(keys);
  }

  // ---------- parejas ----------
  async createCouple(names: string) {
    return this.tx((db) => {
      const id = uid("c");
      let slug = slugify(names) || id;
      while (db.couples.some((c) => c.slug === slug)) slug += "-2";
      db.couples.push({
        id,
        slug,
        names: names.trim(),
        planId: null,
        location: "",
        weddingDate: "",
        inGallery: false,
        inPortfolio: false,
        portfolioOrder: Math.max(-1, ...db.couples.map((c) => c.portfolioOrder)) + 1,
        portalStatus: "active",
        createdAt: now(),
        deletedAt: null,
      });
      db.publicProfiles.push({
        coupleId: id,
        coverFileId: null,
        coverMotionKey: null,
        banner: null,
        title: names.trim(),
        description: "",
      });
      db.presentations.push({
        coupleId: id,
        banner: null,
        songKey: null,
        songName: null,
        message: "",
        messageSignature: "— Carozzi & Zelmar",
        publishedAt: null,
        published: null,
        updatedAt: now(),
      });
      return id;
    });
  }

  async updateCouple(id: Id, patch: Partial<Pick<Couple, "names" | "slug" | "planId" | "location" | "weddingDate">>) {
    await this.tx((db) => {
      const c = this.couple(db, id);
      if (patch.slug !== undefined) {
        const slug = slugify(patch.slug);
        if (!slug) throw new Error("La URL no puede quedar vacía");
        if (db.couples.some((x) => x.id !== id && x.slug === slug)) throw new Error("Esa URL ya la usa otra pareja");
        patch = { ...patch, slug };
      }
      const prevNames = c.names;
      Object.assign(c, patch);
      // el título público sigue a los nombres mientras nadie lo haya cambiado a mano
      const profile = db.publicProfiles.find((p) => p.coupleId === id);
      if (profile && patch.names && (profile.title === prevNames || !profile.title)) profile.title = patch.names;
    });
  }

  async setCoverages(coupleId: Id, types: CoverageType[]) {
    if (!types.length) throw new Error("La historia necesita al menos una cobertura");
    await this.tx((db) => {
      const c = this.couple(db, coupleId);
      const current = db.coverages.filter((cv) => cv.coupleId === coupleId);
      for (const cv of current.filter((cv) => !types.includes(cv.type))) {
        const moments = momentIdsOfCoverage(db, cv.id);
        this.dropFiles(db, new Set(db.files.filter((f) => moments.has(f.momentId)).map((f) => f.id)));
        db.moments = db.moments.filter((m) => m.coverageId !== cv.id);
        db.coverages = db.coverages.filter((x) => x.id !== cv.id);
      }
      for (const type of types.filter((t) => !current.some((cv) => cv.type === t))) {
        db.coverages.push({
          id: uid("cv"),
          coupleId,
          type,
          date: type === "boda" ? c.weddingDate : "",
          location: type === "boda" ? c.location : "",
          showInGallery: true,
          showInPortfolio: type === "boda",
        });
      }
    });
  }

  async updateCoverage(id: Id, patch: { date?: string; location?: string }) {
    await this.tx((db) => {
      const cv = db.coverages.find((x) => x.id === id);
      if (cv) Object.assign(cv, patch);
    });
  }

  async setCoupleVisibility(coupleId: Id, patch: { inGallery?: boolean; inPortfolio?: boolean }) {
    await this.tx((db) => {
      const c = this.couple(db, coupleId);
      if (patch.inGallery !== undefined) c.inGallery = patch.inGallery;
      if (patch.inPortfolio !== undefined) {
        if (patch.inPortfolio && !c.inGallery) throw new Error("Primero tiene que estar visible en galería");
        if (patch.inPortfolio && !c.inPortfolio) {
          // entra al final del carrusel
          c.portfolioOrder = Math.max(-1, ...db.couples.filter((x) => x.inPortfolio).map((x) => x.portfolioOrder)) + 1;
          // sin selección para la home: un video y hasta 12 fotos de la boda (o de la primera cobertura)
          const covs = db.coverages.filter((cv) => cv.coupleId === coupleId);
          if (!db.publicItems.some((i) => i.scope === "portfolio" && covs.some((cv) => cv.id === i.coverageId))) {
            const cv = covs.find((x) => x.type === "boda") ?? covs[0];
            if (cv) {
              cv.showInPortfolio = true;
              const moments = momentIdsOfCoverage(db, cv.id);
              const files = db.files.filter((f) => moments.has(f.momentId));
              const pick = [...files.filter((f) => f.kind === "video").slice(0, 1), ...files.filter((f) => f.kind === "photo").slice(0, 12)];
              pick.forEach((f, order) => db.publicItems.push({ id: uid("pi"), coverageId: cv.id, fileId: f.id, scope: "portfolio", order }));
            }
          }
        }
        c.inPortfolio = patch.inPortfolio;
      }
      if (!c.inGallery) c.inPortfolio = false; // regla §6: sin galería no hay portafolio
    });
  }

  async reorderPortfolio(coupleIds: Id[]) {
    await this.tx((db) => {
      coupleIds.forEach((id, i) => {
        const c = db.couples.find((x) => x.id === id);
        if (c) c.portfolioOrder = i;
      });
    });
  }

  async setPortalStatus(coupleId: Id, status: PortalStatus) {
    await this.tx((db) => {
      this.couple(db, coupleId).portalStatus = status;
    });
  }

  async deleteCouple(coupleId: Id) {
    await this.tx((db) => {
      this.dropFiles(db, new Set(filesOfCouple(db, coupleId).map((f) => f.id)));
      const coverages = new Set(db.coverages.filter((c) => c.coupleId === coupleId).map((c) => c.id));
      const pres = db.presentations.find((p) => p.coupleId === coupleId);
      const profile = db.publicProfiles.find((p) => p.coupleId === coupleId);
      void storage.remove([pres?.songKey, pres?.banner?.key, profile?.coverMotionKey, profile?.banner?.key].filter(Boolean) as string[]);
      db.moments = db.moments.filter((m) => !coverages.has(m.coverageId));
      db.coverages = db.coverages.filter((c) => c.coupleId !== coupleId);
      db.presentations = db.presentations.filter((p) => p.coupleId !== coupleId);
      db.publicProfiles = db.publicProfiles.filter((p) => p.coupleId !== coupleId);
      db.coupleTags = db.coupleTags.filter((t) => t.coupleId !== coupleId);
      db.members = db.members.filter((m) => m.coupleId !== coupleId);
      db.testimonials = db.testimonials.filter((t) => t.coupleId !== coupleId);
      db.couples = db.couples.filter((c) => c.id !== coupleId);
    });
    await this.afterCoupleDeleted();
  }

  // ---------- archivos ----------
  async addFiles(coverageId: Id, files: NewFile[], onProgress?: (done: number) => void) {
    // primero los blobs (lo lento), después los datos en una sola escritura
    const stored: (NewFile & { key: string; size: number })[] = [];
    for (const f of files) {
      const key = await storage.put(f.blob);
      mediaUrls.prime(key, f.blob);
      stored.push({ ...f, key, size: f.blob.size });
      onProgress?.(stored.length);
    }
    return this.tx((db) => {
      if (!db.coverages.some((c) => c.id === coverageId)) throw new Error("Cobertura no encontrada");
      // si la ficha pública todavía no tiene selección, arranca con todo (después se recorta)
      const firstUpload = !db.publicItems.some((i) => i.coverageId === coverageId && i.scope === "gallery");
      const added: Id[] = [];
      for (const f of stored) {
        const name = f.momentName.trim() || "General";
        let moment = db.moments.find((m) => m.coverageId === coverageId && m.name.toLowerCase() === name.toLowerCase());
        if (!moment) {
          moment = {
            id: uid("m"),
            coverageId,
            name,
            order: Math.max(-1, ...db.moments.filter((m) => m.coverageId === coverageId).map((m) => m.order)) + 1,
          };
          db.moments.push(moment);
        }
        const momentId = moment.id;
        const id = uid("f");
        added.push(id);
        db.files.push({
          id,
          momentId,
          kind: f.kind,
          name: f.name,
          storageKey: f.key,
          width: f.width,
          height: f.height,
          durationSec: f.durationSec,
          sizeBytes: f.size,
          takenAt: f.takenAt,
          order: Math.max(-1, ...db.files.filter((x) => x.momentId === momentId).map((x) => x.order)) + 1,
          published: false,
        });
      }
      if (firstUpload) {
        added.forEach((fileId, order) => db.publicItems.push({ id: uid("pi"), coverageId, fileId, scope: "gallery", order }));
      }
      return stored.length;
    });
  }

  async renameMoment(id: Id, name: string) {
    if (!name.trim()) throw new Error("El momento necesita un nombre");
    await this.tx((db) => {
      const m = db.moments.find((x) => x.id === id);
      if (m) m.name = name.trim();
    });
  }

  async moveMoment(id: Id, dir: -1 | 1) {
    await this.tx((db) => {
      const m = db.moments.find((x) => x.id === id);
      if (!m) return;
      const list = db.moments.filter((x) => x.coverageId === m.coverageId).sort((a, b) => a.order - b.order);
      const i = list.indexOf(m);
      const other = list[i + dir];
      if (!other) return;
      list[i] = other;
      list[i + dir] = m;
      list.forEach((x, n) => (x.order = n));
    });
  }

  async deleteMoment(id: Id) {
    await this.tx((db) => {
      this.dropFiles(db, new Set(db.files.filter((f) => f.momentId === id).map((f) => f.id)));
      db.moments = db.moments.filter((m) => m.id !== id);
    });
  }

  async moveFile(fileId: Id, toMomentId: Id) {
    await this.tx((db) => {
      const f = db.files.find((x) => x.id === fileId);
      if (!f || f.momentId === toMomentId) return;
      f.momentId = toMomentId;
      f.order = Math.max(-1, ...db.files.filter((x) => x.momentId === toMomentId && x.id !== fileId).map((x) => x.order)) + 1;
      f.published = false;
    });
  }

  async shiftFile(fileId: Id, dir: -1 | 1) {
    await this.tx((db) => {
      const f = db.files.find((x) => x.id === fileId);
      if (!f) return;
      const list = db.files.filter((x) => x.momentId === f.momentId).sort((a, b) => a.order - b.order);
      const i = list.indexOf(f);
      const other = list[i + dir];
      if (!other) return;
      list[i] = other;
      list[i + dir] = f;
      list.forEach((x, n) => (x.order = n));
    });
  }

  async deleteFile(fileId: Id) {
    await this.tx((db) => this.dropFiles(db, new Set([fileId])));
  }

  async publishFiles(coupleId: Id) {
    await this.tx((db) => filesOfCouple(db, coupleId).forEach((f) => (f.published = true)));
  }

  async uploadAsset(blob: Blob) {
    const key = await storage.put(blob, { asset: true });
    mediaUrls.prime(key, blob);
    return key;
  }

  // ---------- presentación ----------
  async updatePresentation(coupleId: Id, patch: Partial<PresentationContent>) {
    await this.tx((db) => {
      const p = db.presentations.find((x) => x.coupleId === coupleId);
      if (!p) throw new Error("Presentación no encontrada");
      Object.assign(p, patch, { updatedAt: now() });
    });
  }

  async setPresItems(coverageId: Id, role: PresItemRole, fileIds: Id[]) {
    await this.tx((db) => {
      db.presItems = db.presItems.filter((i) => !(i.coverageId === coverageId && i.role === role));
      fileIds.forEach((fileId, order) => db.presItems.push({ id: uid("pres"), coverageId, fileId, role, order }));
      const coupleId = db.coverages.find((c) => c.id === coverageId)?.coupleId;
      const p = db.presentations.find((x) => x.coupleId === coupleId);
      if (p) p.updatedAt = now();
    });
  }

  async publishPresentation(coupleId: Id) {
    await this.tx((db) => {
      const p = db.presentations.find((x) => x.coupleId === coupleId);
      if (!p) throw new Error("Presentación no encontrada");
      const coverages = new Set(db.coverages.filter((c) => c.coupleId === coupleId).map((c) => c.id));
      p.published = {
        banner: p.banner,
        songKey: p.songKey,
        songName: p.songName,
        message: p.message,
        messageSignature: p.messageSignature,
        items: structuredClone(db.presItems.filter((i) => coverages.has(i.coverageId))),
      };
      p.publishedAt = now();
      p.updatedAt = p.publishedAt;
    });
  }

  // ---------- ficha pública ----------
  async updatePublicProfile(coupleId: Id, patch: Partial<Omit<PublicProfile, "coupleId">>) {
    await this.tx((db) => {
      const p = db.publicProfiles.find((x) => x.coupleId === coupleId);
      if (p) Object.assign(p, patch);
    });
  }

  async setCoverageFlags(coverageId: Id, patch: { showInGallery?: boolean; showInPortfolio?: boolean }) {
    await this.tx((db) => {
      const cv = db.coverages.find((x) => x.id === coverageId);
      if (cv) Object.assign(cv, patch);
    });
  }

  async setPublicItems(coverageId: Id, scope: PublicScope, fileIds: Id[]) {
    await this.tx((db) => {
      db.publicItems = db.publicItems.filter((i) => !(i.coverageId === coverageId && i.scope === scope));
      fileIds.forEach((fileId, order) => db.publicItems.push({ id: uid("pi"), coverageId, fileId, scope, order }));
    });
  }

  async setTags(coupleId: Id, names: string[]) {
    await this.tx((db) => {
      db.coupleTags = db.coupleTags.filter((t) => t.coupleId !== coupleId);
      for (const raw of names) {
        const name = raw.trim();
        if (!name) continue;
        let tag = db.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
        if (!tag) {
          tag = { id: uid("t"), name };
          db.tags.push(tag);
        }
        if (!db.coupleTags.some((t) => t.coupleId === coupleId && t.tagId === tag!.id)) {
          db.coupleTags.push({ coupleId, tagId: tag.id });
        }
      }
    });
  }

  // ---------- agradecimientos ----------
  async repostTestimonial(id: Id, text: string) {
    if (!text.trim()) throw new Error("El texto no puede quedar vacío");
    await this.tx((db) => {
      const t = db.testimonials.find((x) => x.id === id);
      if (t) Object.assign(t, { publishedText: text.trim(), reposted: true, updatedAt: now() });
    });
  }

  async unrepostTestimonial(id: Id) {
    await this.tx((db) => {
      const t = db.testimonials.find((x) => x.id === id);
      if (t) Object.assign(t, { reposted: false, updatedAt: now() });
    });
  }

  // ---------- acceso ----------
  async saveMember(coupleId: Id, email: string, memberId?: Id) {
    const clean = email.trim().toLowerCase();
    if (!isEmail(clean)) throw new Error("Ese correo no es válido");
    return this.tx((db) => {
      const taken = db.members.find((m) => m.email === clean && m.id !== memberId && m.status !== "revoked");
      if (taken) {
        throw new Error(
          taken.coupleId === coupleId ? "Ese correo ya está en la lista" : "Ese correo ya tiene acceso a otra historia"
        );
      }
      if (memberId) {
        const m = db.members.find((x) => x.id === memberId);
        if (!m) throw new Error("Correo no encontrado");
        if (m.status === "active") throw new Error("La cuenta ya está activa: no se puede cambiar el correo");
        if (m.email !== clean) Object.assign(m, { email: clean, status: "saved", inviteToken: null, invitedAt: null });
        return m.id;
      }
      const id = uid("mem");
      db.members.push({ id, coupleId, email: clean, name: "", status: "saved", invitedAt: null, inviteToken: null, passwordHash: null });
      return id;
    });
  }

  async removeMember(memberId: Id) {
    await this.tx((db) => {
      db.members = db.members.filter((m) => m.id !== memberId);
      db.testimonials = db.testimonials.filter((t) => t.memberId !== memberId);
    });
  }

  async sendInvites(coupleId: Id) {
    return this.tx((db) => {
      const links: InviteLink[] = [];
      db.members
        .filter((m) => m.coupleId === coupleId && (m.status === "saved" || m.status === "expired"))
        .forEach((m) => {
          Object.assign(m, { status: "invited", inviteToken: crypto.randomUUID(), invitedAt: now() });
          links.push({ email: m.email, token: m.inviteToken! });
        });
      return links;
    });
  }

  async resendInvite(memberId: Id) {
    return this.tx((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (!m) throw new Error("Correo no encontrado");
      Object.assign(m, { status: "invited", inviteToken: crypto.randomUUID(), invitedAt: now(), passwordHash: null });
      return { email: m.email, token: m.inviteToken! };
    });
  }

  async revokeMember(memberId: Id) {
    await this.tx((db) => {
      const m = db.members.find((x) => x.id === memberId);
      if (m) Object.assign(m, { status: "revoked", inviteToken: null });
    });
  }
}

// usado por las vistas para encontrar la cobertura de un archivo
export { coverageOfFile };
