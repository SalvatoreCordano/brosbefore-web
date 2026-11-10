// Fotos repartidas en columnas que se leen en orden (1, 2, 3 / 4, 5, 6…): cada foto va a la columna más corta.

/** Ancho mínimo de una foto en la ficha: más ancho disponible, más columnas (de 2 a 5). */
export const PHOTO_COL_MIN = 560;
export const photoColumnCount = (width: number) => Math.max(2, Math.min(5, Math.floor(width / PHOTO_COL_MIN)));

/** Columnas de la galería del panel de la home (ancho = 62 % de la pantalla); coincide con los tramos de ancho del CSS. */
export const detailColumnCount = (viewport: number) => (viewport >= 3000 ? 4 : viewport >= 2200 ? 3 : 2);

/** Reparte los elementos en `count` columnas; `n` es su posición original (para mantener el orden en una sola columna). */
export function splitColumns<T>(items: T[], ratio: (item: T) => number, count: number): { item: T; n: number }[][] {
  const cols: { item: T; n: number }[][] = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);
  items.forEach((item, n) => {
    const min = Math.min(...heights);
    const c = heights.findIndex((h) => h <= min + 0.05); // casi empate → la más a la izquierda, para no invertir el orden
    heights[c] += ratio(item);
    cols[c].push({ item, n });
  });
  return cols;
}
