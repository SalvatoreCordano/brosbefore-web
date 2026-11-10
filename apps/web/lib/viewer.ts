// Abre el visor de fotos. La librería se baja recién al abrir la primera foto.
import type { ViewerPhoto } from "./viewer-impl";

export type { ViewerPhoto };

export async function openViewer(photos: ViewerPhoto[], index: number, origin?: (i: number) => HTMLElement | null) {
  const { openViewer: open } = await import("./viewer-impl");
  return open(photos, index, origin);
}
