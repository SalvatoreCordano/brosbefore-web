// Copia /assets (fuente única mientras convive el sitio estático) a public/assets de una app.
// Uso: node ../../scripts/sync-assets.mjs   (desde apps/web o apps/admin)
import { cpSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const from = resolve(root, "assets");
const to = resolve(process.cwd(), "public/assets");
if (!existsSync(from)) throw new Error(`No existe ${from}`);
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
console.log(`assets → ${to}`);
