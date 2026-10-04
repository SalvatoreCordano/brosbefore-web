// Almacenamiento de archivos. Hoy: MockStorage (IndexedDB del navegador, claves "idb:…").
// En sandbox: R2Storage con URLs firmadas, misma interfaz.

export interface Storage {
  put(blob: Blob): Promise<string>; // devuelve la storageKey
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

export const storage: Storage = new MockStorage();

/**
 * URLs de los archivos guardados en el navegador. resolve() es síncrono (lo usan las vistas):
 * si la URL todavía no está lista devuelve "" y avisa a los suscriptores cuando lo está.
 */
class MediaUrlCache {
  private urls = new Map<string, string>();
  private pending = new Set<string>();
  private listeners = new Set<() => void>();

  get(key: string): string {
    const url = this.urls.get(key);
    if (url) return url;
    if (typeof window !== "undefined" && !this.pending.has(key)) {
      this.pending.add(key);
      storage.get(key).then((blob) => {
        this.pending.delete(key);
        if (!blob) return;
        this.urls.set(key, URL.createObjectURL(blob));
        this.listeners.forEach((l) => l());
      });
    }
    return "";
  }
  /** para un archivo recién subido: ya tenemos el blob, no hace falta leerlo de IndexedDB */
  prime(key: string, blob: Blob) {
    if (!this.urls.has(key)) this.urls.set(key, URL.createObjectURL(blob));
  }
  forget(key: string) {
    const url = this.urls.get(key);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(key);
  }
  forgetAll() {
    [...this.urls.keys()].forEach((k) => this.forget(k));
  }
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

export const mediaUrls = new MediaUrlCache();

/** Arma el resolve de URLs de una app: claves del navegador → blob URL; el resto → función de la app. */
export function makeResolver(assetUrl: (key: string) => string) {
  return (key: string) => (key.startsWith("idb:") ? mediaUrls.get(key) : assetUrl(key));
}
