// Almacenamiento en R2 a través del Worker `api` (apps/api). El navegador nunca ve credenciales de R2:
// sube con su sesión de Supabase y lee con enlaces firmados que el Worker entrega solo si Supabase lo permite.
import type { Storage } from "./storage";

export interface R2Options {
  api: string; // URL del Worker, ej. https://api.brosbeforefilm.com
  token: () => Promise<string | null>; // token de la sesión de Supabase
  singleMax?: number; // hasta este tamaño sube en una sola petición
  partSize?: number; // tamaño de cada parte en la subida grande
  preview?: (image: Blob) => Promise<Blob>; // solo para pruebas
}

// El plan gratis de Workers rechaza cuerpos de más de 100 MB: las partes quedan por debajo.
const SINGLE_MAX = 80 * 1024 * 1024;
const PART_SIZE = 50 * 1024 * 1024;
const PREVIEW_PX = 1600;

/** Versión ligera de una foto (WebP, 1600 px de lado mayor). Al volver a dibujarla se borran los datos EXIF (ubicación, cámara). */
export async function imagePreview(blob: Blob, max = PREVIEW_PX): Promise<Blob> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob);
  } catch {
    throw new Error("No se pudo leer la imagen. Usa JPG, PNG o WebP.");
  }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
}

export class R2Storage implements Storage {
  constructor(private o: R2Options) {}

  private async send(method: string, path: string, body?: Blob | string, type?: string): Promise<any> {
    const token = await this.o.token();
    if (!token) throw new Error("Inicia sesión para subir archivos.");
    const headers: Record<string, string> = { authorization: `Bearer ${token}` };
    const contentType = type ?? (body instanceof Blob ? body.type : body ? "application/json" : "");
    if (contentType) headers["content-type"] = contentType;
    const res = await fetch(`${this.o.api}${path}`, { method, headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `El servidor de archivos respondió ${res.status}.`);
    return data;
  }

  async put(blob: Blob, opts?: { asset?: boolean }) {
    const id = crypto.randomUUID();
    if (opts?.asset) {
      await this.send("PUT", `/u/a/${id}`, blob);
      return `a/${id}`;
    }
    // la versión ligera se arma antes de subir nada: si la foto no se puede leer, falla sin dejar basura
    const preview = blob.type.startsWith("image/") ? await (this.o.preview ?? imagePreview)(blob) : null;
    try {
      if (blob.size <= (this.o.singleMax ?? SINGLE_MAX)) await this.send("PUT", `/u/o/${id}`, blob);
      else await this.multipart(id, blob);
      if (preview) await this.send("PUT", `/u/p/${id}`, preview);
    } catch (e) {
      await this.remove([`o/${id}`]);
      throw e;
    }
    return `o/${id}`;
  }

  private async multipart(id: string, blob: Blob) {
    const size = this.o.partSize ?? PART_SIZE;
    const { uploadId } = await this.send("POST", `/m/${id}?size=${blob.size}`, undefined, blob.type || "application/octet-stream");
    try {
      const parts: { partNumber: number; etag: string }[] = [];
      for (let n = 1, at = 0; at < blob.size; n++, at += size) {
        const { etag } = await this.send("PUT", `/m/${id}?u=${uploadId}&n=${n}`, blob.slice(at, at + size), "application/octet-stream");
        parts.push({ partNumber: n, etag });
      }
      await this.send("POST", `/m/${id}/done?u=${uploadId}`, JSON.stringify({ parts }));
    } catch (e) {
      await this.send("DELETE", `/m/${id}?u=${uploadId}`).catch(() => {});
      throw e;
    }
  }

  /** enlaces firmados de lectura (solo de lo que la sesión puede ver) */
  async sign(keys: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    for (let i = 0; i < keys.length; i += 500) {
      const { urls } = await this.send("POST", "/sign", JSON.stringify({ keys: keys.slice(i, i + 500) }));
      Object.assign(out, urls);
    }
    return out;
  }

  async get(key: string) {
    const url = (await this.sign([key]))[key];
    const res = url ? await fetch(url) : null;
    return res?.ok ? res.blob() : null;
  }

  async remove(keys: string[]) {
    const own = keys.filter((k) => /^[opa]\//.test(k ?? ""));
    if (!own.length) return;
    try {
      await this.send("POST", "/rm", JSON.stringify({ keys: own }));
    } catch (e) {
      console.warn("No se pudieron borrar archivos de R2", e); // quedan huérfanos, no afectan lo que se ve
    }
  }

  /** copia (o quita) la versión ligera de estas fotos en el bucket público, el que lee la web */
  async syncPublic(add: string[], remove: string[]) {
    const id = (k: string) => k.slice(2);
    for (const k of add) await this.send("POST", `/pub/${id(k)}`);
    for (const k of remove) await this.send("DELETE", `/pub/${id(k)}`);
  }

  async clear() {
    // la demo borra su almacenamiento local; con datos reales nunca se vacía R2 desde el navegador
  }
}
