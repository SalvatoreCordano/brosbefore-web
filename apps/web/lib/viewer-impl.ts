// Visor de fotos en grande (PhotoSwipe): zoom con rueda, pellizco y doble toque, arrastre, flechas y Esc.
// Se carga solo al abrir la primera foto (ver viewer.ts), para no sumar peso a las páginas.
import PhotoSwipe from "photoswipe";
import "photoswipe/style.css";

export interface ViewerPhoto {
  src: string; // lo que se ve en grande
  msrc?: string; // versión ligera que se muestra mientras carga (útil cuando src es el original)
  w?: number;
  h?: number;
  alt: string;
}

const naturalSize = (src: string) =>
  new Promise<[number, number]>((resolve) => {
    const img = new Image();
    img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
    img.onerror = () => resolve([1600, 1067]);
    img.src = src;
  });

/** `origin(i)`: la miniatura de la foto i en la página; el visor sale desde ella y vuelve a ella al cerrar. */
export async function openViewer(photos: ViewerPhoto[], index: number, origin?: (i: number) => HTMLElement | null) {
  // PhotoSwipe necesita las medidas para calcular el zoom; si alguna foto no las trae, se leen de la imagen
  const items = await Promise.all(
    photos.map(async (p) => {
      const [width, height] = p.w && p.h ? [p.w, p.h] : await naturalSize(p.src);
      return { src: p.src, msrc: p.msrc, width, height, alt: p.alt };
    })
  );

  const pswp = new PhotoSwipe({
    dataSource: items,
    index,
    bgOpacity: 1,
    wheelToZoom: true,
    showHideAnimationType: origin ? "zoom" : "fade",
    closeTitle: "Cerrar (Esc)",
    zoomTitle: "Acercar",
    arrowPrevTitle: "Anterior",
    arrowNextTitle: "Siguiente",
    errorMsg: "No se pudo cargar la foto",
    indexIndicatorSep: " / ",
  });
  // de dónde sale y a dónde vuelve la foto: su miniatura en la página
  if (origin) {
    pswp.addFilter("thumbBounds", (bounds, _item, i) => {
      const el = origin(i);
      if (!el) return bounds as NonNullable<typeof bounds>; // sin miniatura a la vista: la foto aparece con fundido
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top + window.scrollY, w: r.width };
    });
  }
  // la página de abajo no se mueve mientras el visor está abierto
  pswp.on("openingAnimationStart", () => document.documentElement.classList.add("has-viewer"));
  pswp.on("destroy", () => document.documentElement.classList.remove("has-viewer"));
  pswp.init();
}
