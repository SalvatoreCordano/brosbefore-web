// Capa de datos. Todas las pantallas leen y escriben por aquí.
// Hoy: MockRepo (datos de ejemplo + localStorage). En sandbox: SupabaseRepo con la misma interfaz.
// Los métodos son async desde ya para que el cambio a Supabase no toque las pantallas.
import type { Db, Id } from "./types";
import { buildSeed, DB_VERSION } from "./seed";

export interface Repo {
  /** Foto completa de la base. Solo el mock la expone tal cual; Supabase la reemplaza por consultas. */
  getDb(): Promise<Db>;
  setCoupleVisibility(coupleId: Id, patch: { inGallery?: boolean; inPortfolio?: boolean }): Promise<void>;
  /** Vuelve a los datos de ejemplo (botón "Restablecer demo"). */
  resetDemo(): Promise<void>;
  /** Avisa cuando la base cambia (en el mock, también desde otra pestaña del mismo sitio). */
  subscribe(listener: () => void): () => void;
}

const STORAGE_KEY = "bb-mock-db";

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

export class MockRepo implements Repo {
  private db: Db | null = null;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== "undefined") {
      // otra pestaña (ej. el admin) cambió la base
      window.addEventListener("storage", (e) => {
        if (e.key !== STORAGE_KEY) return;
        this.db = null;
        this.emit();
      });
    }
  }

  private load(): Db {
    if (!this.db) this.db = (typeof window !== "undefined" && readStored()) || buildSeed();
    return this.db;
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // navegación privada o sin espacio: el mock sigue funcionando en memoria
    }
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  async getDb() {
    return structuredClone(this.load());
  }

  async setCoupleVisibility(coupleId: Id, patch: { inGallery?: boolean; inPortfolio?: boolean }) {
    const couple = this.load().couples.find((c) => c.id === coupleId);
    if (!couple) throw new Error(`Pareja no encontrada: ${coupleId}`);
    if (patch.inGallery !== undefined) couple.inGallery = patch.inGallery;
    if (patch.inPortfolio !== undefined) couple.inPortfolio = patch.inPortfolio;
    // regla §6: sin galería no hay portafolio
    if (!couple.inGallery) couple.inPortfolio = false;
    this.save();
  }

  async resetDemo() {
    this.db = buildSeed();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.emit();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Instancia única por app. En sandbox: `new SupabaseRepo(...)` según variables de entorno. */
export const repo: Repo = new MockRepo();
