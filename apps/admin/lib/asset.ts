import { makeResolver } from "@bb/core";

// rutas base: el admin vive bajo /admin; la web (portal, galería) en la raíz del sitio
export const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_BASE ?? "/admin";
export const WEB_BASE = process.env.NEXT_PUBLIC_WEB_BASE ?? "";

export function asset(key: string): string {
  if (/^(https?:)?\/\//.test(key) || key.startsWith("data:") || key.startsWith("blob:")) return key;
  return `${ADMIN_BASE}/${key.replace(/^\//, "")}`;
}

/** storageKey → URL (archivos de la demo en el navegador, /assets o URLs externas). */
export const resolve = makeResolver(asset);

/** URL de una página de la web pública o del portal (se abre en otra pestaña). */
export const webUrl = (path: string) => `${WEB_BASE}${path}`;
