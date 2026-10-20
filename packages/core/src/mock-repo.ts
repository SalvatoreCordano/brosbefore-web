// MockRepo: datos de ejemplo en localStorage, archivos en IndexedDB y cuentas de demo.
// Solo para desarrollo local y demos; en producción manda SupabaseRepo.
import type { Db } from "./types";
import { DbRepo, hashPassword, isEmail, now, uid } from "./repo";
import { buildSeed, DB_VERSION } from "./seed";
import { mediaUrls, storage } from "./storage";

const STORAGE_KEY = "bb-mock-db";
const SESSION_KEY = "bb-portal-session";

function readStored(): Db | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const db = JSON.parse(raw) as Db;
    return db.version === DB_VERSION ? db : null; // si cambió el modelo, se descarta
  } catch {
    return null;
  }
}

export class MockRepo extends DbRepo {
  readonly mode = "mock" as const;
  private db: Db | null = null;

  constructor() {
    super();
    if (typeof window !== "undefined") {
      // otra pestaña del mismo sitio (ej. admin ↔ web) cambió la base o la sesión
      window.addEventListener("storage", (e) => {
        if (e.key !== STORAGE_KEY && e.key !== SESSION_KEY) return;
        if (e.key === STORAGE_KEY) this.db = null;
        this.emit();
      });
      mediaUrls.subscribe(() => this.emit());
    }
  }

  private loadSync(): Db {
    if (!this.db) this.db = (typeof window !== "undefined" && readStored()) || buildSeed();
    return this.db;
  }
  protected async load() {
    return this.loadSync();
  }
  protected setCache(db: Db) {
    this.db = db;
  }
  protected async commit(_prev: Db, next: Db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // navegación privada o sin espacio: el mock sigue funcionando en memoria
    }
  }
  protected async afterCoupleDeleted() {
    if (localStorage.getItem(SESSION_KEY) && !(await this.getSession())) await this.logout();
  }

  async resetDemo() {
    this.db = buildSeed();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    await storage.clear().catch(() => {});
    this.emit();
  }

  // ---------- portal ----------
  async getSession() {
    let id: string | null = null;
    try {
      id = localStorage.getItem(SESSION_KEY);
    } catch {}
    if (!id) return null;
    const db = this.loadSync();
    const member = db.members.find((m) => m.id === id && m.status === "active");
    const couple = member && db.couples.find((c) => c.id === member.coupleId);
    return member && couple ? structuredClone({ member, couple }) : null;
  }

  async getInvite(token: string) {
    const db = this.loadSync();
    const m = db.members.find((x) => x.inviteToken === token && x.status === "invited");
    const c = m && db.couples.find((x) => x.id === m.coupleId);
    return m && c ? { email: m.email, names: c.names } : null;
  }

  async registerWithInvite(token: string, name: string, password: string) {
    if (!name.trim()) throw new Error("Escribe tu nombre");
    if (password.length < 8) throw new Error("La contraseña necesita al menos 8 caracteres");
    const m = this.loadSync().members.find((x) => x.inviteToken === token && x.status === "invited");
    if (!m) throw new Error("Esta invitación ya no es válida. Pide una nueva a brosbefore.");
    const passwordHash = await hashPassword(m.email, password);
    await this.tx((db) => {
      const mem = db.members.find((x) => x.id === m.id)!;
      Object.assign(mem, { name: name.trim(), status: "active", inviteToken: null, passwordHash });
    });
    this.setSession(m.id);
  }

  async login(email: string, password: string) {
    const clean = email.trim().toLowerCase();
    const m = this.loadSync().members.find((x) => x.email === clean && x.status === "active");
    if (!m || m.passwordHash !== (await hashPassword(clean, password))) {
      throw new Error("Correo o contraseña incorrectos");
    }
    this.setSession(m.id);
  }

  async logout() {
    this.setSession(null);
  }

  private setSession(memberId: string | null) {
    try {
      if (memberId) localStorage.setItem(SESSION_KEY, memberId);
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
    this.emit();
  }

  async writeTestimonial(text: string) {
    const session = await this.getSession();
    if (!session) throw new Error("Tu sesión terminó, vuelve a entrar");
    if (!text.trim()) throw new Error("Escribe tu agradecimiento");
    await this.tx((db) => {
      const t = db.testimonials.find((x) => x.memberId === session.member.id);
      if (t?.reposted) throw new Error("Tu agradecimiento ya está publicado y no se puede editar");
      if (t) Object.assign(t, { originalText: text.trim(), updatedAt: now() });
      else
        db.testimonials.push({
          id: uid("tes"),
          coupleId: session.couple.id,
          memberId: session.member.id,
          originalText: text.trim(),
          publishedText: "",
          reposted: false,
          updatedAt: now(),
        });
    });
  }

  // ---------- admin: en el mock siempre hay sesión ----------
  async getAdmin() {
    return { email: "demo@brosbefore.pe" };
  }
  async adminLogin(email: string) {
    if (!isEmail(email)) throw new Error("Ese correo no es válido");
  }
  async adminLogout() {}
}
