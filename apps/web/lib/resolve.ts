import { makeResolver } from "@bb/core";
import { asset } from "./asset";

/** storageKey → URL para páginas abiertas a todos (archivos de la demo, /assets, copias públicas en R2). */
export const resolve = makeResolver(asset);

/** Igual, para el portal de las parejas: lee de R2 con enlaces firmados de su sesión. */
export const resolvePortal = makeResolver(asset, "private");
