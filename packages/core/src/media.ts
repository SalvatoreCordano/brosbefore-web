// Utilidades de archivos en el navegador: validación de formatos (REQUERIMIENTOS §10),
// lectura de dimensiones/duración, carpetas soltadas, .zip (descomprimir y armar descargas).
import { unzip, zip, type Unzipped } from "fflate";
import type { MediaKind } from "./types";

const MB = 1024 ** 2;
const GB = 1024 ** 3;
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

const RAW = ["cr2", "cr3", "nef", "arw", "raf", "orf", "rw2", "dng", "srw", "pef"];

export type Validation = { ok: true; kind: MediaKind } | { ok: false; reason: string };

/** Archivos entregables (paso 2). */
export function validateDeliverable(name: string, size: number): Validation {
  const e = ext(name);
  if (["jpg", "jpeg", "png", "webp"].includes(e)) {
    return size > 50 * MB ? { ok: false, reason: "La foto pesa más de 50 MB" } : { ok: true, kind: "photo" };
  }
  if (["mp4", "mov", "m4v"].includes(e)) {
    return size > 20 * GB ? { ok: false, reason: "El video pesa más de 20 GB" } : { ok: true, kind: "video" };
  }
  if (RAW.includes(e)) return { ok: false, reason: "Los RAW no se aceptan: sube el material editado" };
  if (["heic", "heif"].includes(e)) return { ok: false, reason: "HEIC todavía no se acepta: exporta a JPG" };
  return { ok: false, reason: "Formato no permitido" };
}

/** Los navegadores no reproducen todos los formatos: para ver en la web se pide MP4 (H.264). */
export const isPlayableVideo = (name: string) => ["mp4", "m4v", "webm"].includes(ext(name));

export function validateSong(file: File): string | null {
  if (!["mp3", "m4a"].includes(ext(file.name))) return "La canción tiene que ser MP3 o M4A";
  if (file.size > 15 * MB) return "La canción pesa más de 15 MB";
  return null;
}

export async function validateMotionCover(file: File): Promise<string | null> {
  const e = ext(file.name);
  if (e === "gif") return file.size > 8 * MB ? "El GIF pesa más de 8 MB (mejor súbelo como MP4)" : null;
  if (!["mp4", "webm"].includes(e)) return "La portada animada tiene que ser MP4, WebM o GIF";
  if (file.size > 15 * MB) return "La portada animada pesa más de 15 MB";
  const meta = await readMediaMeta(file, "video");
  if ((meta.durationSec ?? 0) > 15.5) return "La portada animada dura más de 15 segundos";
  return null;
}

export async function validateBanner(file: File): Promise<{ kind: MediaKind } | { error: string }> {
  const e = ext(file.name);
  if (["jpg", "jpeg", "png", "webp"].includes(e)) return { kind: "photo" };
  if (!["mp4", "webm"].includes(e)) return { error: "El banner tiene que ser una foto (JPG, PNG, WebP) o un video MP4/WebM" };
  if (file.size > 30 * MB) return { error: "El video del banner pesa más de 30 MB" };
  const meta = await readMediaMeta(file, "video");
  if ((meta.durationSec ?? 0) > 20.5) return { error: "El video del banner dura más de 20 segundos" };
  return { kind: "video" };
}

/** Ancho/alto de una foto, o duración y tamaño de un video. */
export function readMediaMeta(blob: Blob, kind: MediaKind): Promise<{ width?: number; height?: number; durationSec?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const done = (v: { width?: number; height?: number; durationSec?: number }) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    if (kind === "photo") {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({});
      img.src = url;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () =>
        done({ width: v.videoWidth || undefined, height: v.videoHeight || undefined, durationSec: Number.isFinite(v.duration) ? v.duration : undefined });
      v.onerror = () => done({});
      v.src = url;
    }
  });
}

export interface PickedFile {
  file: File;
  /** ruta relativa dentro de lo que se soltó: "Boda/03 Ceremonia/IMG_01.jpg" */
  path: string;
}

/** Lee lo que se soltó en la zona de subida, recorriendo carpetas completas. */
export async function filesFromDrop(dt: DataTransfer): Promise<PickedFile[]> {
  const entries = [...dt.items]
    .map((i) => (i.kind === "file" ? i.webkitGetAsEntry?.() : null))
    .filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return [...dt.files].map((file) => ({ file, path: file.name }));
  const out: PickedFile[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, path: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      // readEntries devuelve de a tandas: hay que llamarlo hasta que venga vacío
      let batch: FileSystemEntry[];
      do {
        batch = await new Promise((res, rej) => reader.readEntries(res, rej));
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      } while (batch.length);
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

/** Desde un <input type="file"> (con o sin webkitdirectory). */
export const filesFromInput = (list: FileList): PickedFile[] =>
  [...list].map((file) => ({ file, path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name }));

/** Descomprime los .zip en el navegador; cada carpeta interna se vuelve un momento. */
export async function expandZips(files: PickedFile[]): Promise<PickedFile[]> {
  const out: PickedFile[] = [];
  for (const p of files) {
    if (ext(p.file.name) !== "zip") {
      out.push(p);
      continue;
    }
    const data = new Uint8Array(await p.file.arrayBuffer());
    const unzipped = await new Promise<Unzipped>((res, rej) => unzip(data, (err, r) => (err ? rej(err) : res(r))));
    const base = p.path.replace(/\.zip$/i, "");
    for (const [path, bytes] of Object.entries(unzipped)) {
      if (path.endsWith("/") || path.startsWith("__MACOSX") || path.split("/").pop()?.startsWith(".")) continue;
      const name = path.split("/").pop()!;
      out.push({ file: new File([bytes as BlobPart], name), path: `${base}/${path}` });
    }
  }
  return out;
}

/** "Boda/03 Ceremonia/IMG.jpg" → "Ceremonia" · archivo suelto → "General" */
export function momentNameFromPath(path: string) {
  const parts = path.split("/");
  if (parts.length < 2) return "General";
  return parts[parts.length - 2].replace(/^\d+[\s._-]*/, "").trim() || parts[parts.length - 2];
}

// ---------------------------------------------------------------- descargas

export function downloadUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Arma un .zip en el navegador (sin servidor) y lo descarga. */
export async function downloadZip(
  entries: { path: string; url: string }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void
) {
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  let done = 0;
  for (const e of entries) {
    const res = await fetch(e.url);
    if (!res.ok) throw new Error(`No se pudo leer ${e.path}`);
    let path = e.path;
    for (let n = 2; used.has(path); n++) path = e.path.replace(/(\.[^./]+)?$/, ` (${n})$1`);
    used.add(path);
    files[path] = new Uint8Array(await res.arrayBuffer());
    onProgress?.(++done, entries.length);
  }
  // nivel 0: fotos y videos ya vienen comprimidos, solo se empaquetan
  const zipped = await new Promise<Uint8Array>((res, rej) => zip(files, { level: 0 }, (err, r) => (err ? rej(err) : res(r))));
  const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: "application/zip" }));
  downloadUrl(url, zipName);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
