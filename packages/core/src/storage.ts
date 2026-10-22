// Almacenamiento de archivos. Demo: MockStorage (IndexedDB del navegador, claves "idb:…").
// Con datos reales: R2Storage (r2-storage.ts), misma interfaz; claves "o/<id>" (original) y "a/<id>" (recurso público).

// process lo reemplaza Next al compilar (igual que en instance.ts)
declare const process: { env: Record<string, string | undefined> };
const CDN = (process.env.NEXT_PUBLIC_CDN_URL ?? "").replace(/\/$/, "");

export interface Storage {
  /** `asset`: recurso público (banner, canción), no un archivo de la pareja. Devuelve la storageKey. */
  put(blob: Blob, opts?: { asset?: boolean }): Promise<string>;
  get(key: string): Promise<Blob | null>;
  remove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

const DB_NAME = "bb-mock-files";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export class MockStorage implements Storage {
  async put(blob: Blob) {
    const key = `idb:${crypto.randomUUID()}`;
    await run("readwrite", (s) => s.put(blob, key));
    return key;
  }
  async get(key: string) {
    if (!key.startsWith("idb:")) return null;
    return ((await run<Blob>("readonly", (s) => s.get(key))) as Blob | undefined) ?? null;
  }
  async remove(keys: string[]) {
    const own = keys.filter((k) => k?.startsWith("idb:"));
    if (!own.length) return;
    await run("readwrite", (s) => {
      own.forEach((k) => s.delete(k));
    });
    own.forEach((k) => mediaUrls.forget(k));
  }
  async clear() {
    await run("readwrite", (s) => s.clear());
    mediaUrls.forgetAll();
  }
}

export let storage: Storage = new MockStorage();
export function setStorage(s: Storage) {
  storage = s;
}

/**
 * URLs de los archivos. resolve() es síncrono (lo usan las vistas): si la URL todavía no está lista
 * devuelve "" y avisa a los suscriptores cuando lo está. Dos orígenes:
 *  - "idb:…": archivos de la demo, guardados en el navegador (blob URL).
 *  - "o/…" y "p/…": archivos de R2, con enlace firmado que pide el `signer` (en lotes) y se renueva solo.
 */
const R2_KEY = /^[op]\//;
const REFRESH_MS = 90 * 60 * 1000; // el enlace firmado dura 2 h
type Signer = (keys: string[]) => Promise<Record<string, string>>;

class MediaUrlCache {
  private urls = new Map<string, string>();
  private at = new Map<string, number>();
  private pending = new Set<string>();
  private queue = new Set<string>();
  private signer: Signer | null = null;
  private listeners = new Set<() => void>();

  useSigner(s: Signer) {
    this.signer = s;
  }

  get(key: string): string {
    if (typeof window === "undefined") return this.urls.get(key) ?? "";
    const url = this.urls.get(key);
    const stale = R2_KEY.test(key) && Date.now() - (this.at.get(key) ?? 0) > REFRESH_MS;
    if ((url && !stale) || this.pending.has(key)) return url ?? "";
    this.pending.add(key);
    if (R2_KEY.test(key)) this.enqueue(key);
    else
      storage.get(key).then((blob) => {
        this.pending.delete(key);
        if (!blob) return;
        this.urls.set(key, URL.createObjectURL(blob));
        this.listeners.forEach((l) => l());
      });
    return url ?? "";
  }
  private enqueue(key: string) {
    if (!this.queue.size) setTimeout(() => this.flush(), 30); // junta lo que pide una pantalla en un solo viaje
    this.queue.add(key);
  }
  private async flush() {
    const keys = [...this.queue];
    this.queue.clear();
    let signed: Record<string, string> = {};
    try {
      signed = (await this.signer?.(keys)) ?? {};
    } catch {
      // sin sesión o sin red: se reintenta cuando la pantalla vuelva a pedirlo
    }
    keys.forEach((k) => this.pending.delete(k));
    const got = Object.entries(signed);
    got.forEach(([k, u]) => {
      this.urls.set(k, u);
      this.at.set(k, Date.now());
    });
    if (got.length) this.listeners.forEach((l) => l());
  }
  /** para un archivo recién subido: ya tenemos el blob, no hace falta leerlo ni firmarlo */
  prime(key: string, blob: Blob) {
    if (this.urls.has(key)) return;
    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    this.at.set(key, Date.now());
    if (key.startsWith("o/") && blob.type.startsWith("image/")) this.urls.set(`p/${key.slice(2)}`, url);
  }
  forget(key: string) {
    for (const k of key.startsWith("o/") ? [key, `p/${key.slice(2)}`] : [key]) {
      const url = this.urls.get(k);
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      this.urls.delete(k);
      this.at.delete(k);
    }
  }
  forgetAll() {
    [...this.urls.keys()].forEach((k) => this.forget(k));
  }
  /** al cambiar de sesión: los enlaces firmados eran de otra persona */
  forgetSigned() {
    [...this.urls.keys()].filter((k) => R2_KEY.test(k)).forEach((k) => this.forget(k));
  }
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const mediaUrls = new MediaUrlCache();

/**
 * Arma el resolve de URLs de una app. `resolve(key)` da lo que se muestra (foto: versión ligera) y
 * `resolve.original(key)` el archivo completo (videos, descargas). Claves del navegador → blob URL;
 * R2: en modo "public" (páginas abiertas a todos) la copia ligera del dominio público; en modo
 * "private" (portal y admin, con sesión) un enlace firmado; el resto → función de la app.
 */
export type Resolver = ((key: string) => string) & { original: (key: string) => string };

export function makeResolver(assetUrl: (key: string) => string, mode: "public" | "private" = "public"): Resolver {
  const pick = (key: string, original: boolean) => {
    if (key.startsWith("idb:")) return mediaUrls.get(key);
    if (key.startsWith("a/")) return `${CDN}/${key}`;
    if (key.startsWith("o/") || key.startsWith("p/")) {
      const id = key.slice(2);
      if (mode === "private") return mediaUrls.get(`${original ? "o" : "p"}/${id}`);
      return original ? "" : `${CDN}/p/${id}`; // el original nunca es público
    }
    return assetUrl(key);
  };
  const resolve = ((key: string) => pick(key, false)) as Resolver;
  resolve.original = (key) => pick(key, true);
  return resolve;
}
