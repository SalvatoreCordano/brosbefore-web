import { makeResolver } from "@bb/core";
import { asset } from "./asset";

/** storageKey → URL (archivos de la demo en el navegador, /assets o URLs externas). */
export const resolve = makeResolver(asset);
