import type { NextConfig } from "next";

// En GitHub Pages el sitio vive bajo una subruta (ej. /brosbefore-web/demo): se pasa por env.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const config: NextConfig = {
  output: "export", // sitio estático (GitHub Pages hoy, Cloudflare Workers después)
  basePath,
  images: { unoptimized: true },
  transpilePackages: ["@bb/core"],
};

export default config;
