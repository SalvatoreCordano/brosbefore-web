import type { NextConfig } from "next";

// El admin vive en /admin del mismo sitio (en local, la web lo sirve con un rewrite;
// publicado, va en la subcarpeta admin/). En producción real pasa a admin.brosbefore.com.
const webBase = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = `${webBase}/admin`;

const config: NextConfig = {
  ...(process.env.NODE_ENV === "development" ? {} : { output: "export" as const }),
  basePath,
  env: { NEXT_PUBLIC_ADMIN_BASE: basePath, NEXT_PUBLIC_WEB_BASE: webBase },
  images: { unoptimized: true },
  transpilePackages: ["@bb/core"],
};

export default config;
