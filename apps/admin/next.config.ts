import type { NextConfig } from "next";

// Por defecto el admin vive en /admin del mismo sitio (en local, la web lo sirve con un rewrite;
// en GitHub Pages va en la subcarpeta admin/). En Cloudflare tiene su propio subdominio:
// NEXT_PUBLIC_ADMIN_PATH="/" lo deja en la raíz y NEXT_PUBLIC_WEB_URL apunta a la web.
const webBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const adminPath = process.env.NEXT_PUBLIC_ADMIN_PATH ?? "/admin";
const basePath = `${webBase}${adminPath === "/" ? "" : adminPath}`;

const config: NextConfig = {
  ...(process.env.NODE_ENV === "development" ? {} : { output: "export" as const }),
  basePath,
  env: { NEXT_PUBLIC_ADMIN_BASE: basePath, NEXT_PUBLIC_WEB_BASE: process.env.NEXT_PUBLIC_WEB_URL ?? webBase },
  images: { unoptimized: true },
  transpilePackages: ["@bb/core"],
};

export default config;
