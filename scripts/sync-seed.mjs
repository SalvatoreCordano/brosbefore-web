// Copia las parejas del sitio estático (js/data.js) a los datos de ejemplo del monorepo.
// Correr después de traer cambios de contenido desde main:  pnpm seed:sync
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = readFileSync(root + "js/data.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox);
const works = sandbox.window.WORKS;
if (!Array.isArray(works) || !works.length) throw new Error("js/data.js no define window.WORKS");

const out = `// GENERADO por scripts/sync-seed.mjs desde js/data.js — no editar a mano.
import type { PortfolioItem } from "../types";

export const legacyWorks: PortfolioItem[] = ${JSON.stringify(works, null, 2)};
`;
writeFileSync(root + "packages/core/src/seed/legacy-works.ts", out);
console.log(`seed: ${works.length} parejas → packages/core/src/seed/legacy-works.ts`);
