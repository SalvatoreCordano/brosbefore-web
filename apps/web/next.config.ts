import type { NextConfig } from "next";

// En GitHub Pages el sitio vive bajo una subruta (ej. /brosbefore-web/demo): se pasa por env.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const isDev = process.env.NODE_ENV === "development";
// En local el admin corre aparte (puerto 3001) y se sirve bajo /admin de la web: así ambos
// comparten el mismo origen y por lo tanto los datos de la demo (localStorage / IndexedDB).
const adminDevUrl = process.env.ADMIN_DEV_URL ?? "http://localhost:3001";

const config: NextConfig = {
  // sitio estático (GitHub Pages hoy, Cloudflare Workers después)
  ...(isDev ? {} : { output: "export" as const }),
  basePath,
  images: { unoptimized: true },
  transpilePackages: ["@bb/core"],
  ...(isDev && {
    async rewrites() {
      return [
        { source: "/admin", destination: `${adminDevUrl}/admin`, basePath: false as const },
        { source: "/admin/:path*", destination: `${adminDevUrl}/admin/:path*`, basePath: false as const },
      ];
    },
  }),
};

export default config;
