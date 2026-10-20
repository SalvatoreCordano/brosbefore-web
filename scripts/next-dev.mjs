// next dev con puerto por defecto distinto por app (web 3003, admin 3004).
// Si la variable PORT viene definida (ej. desde el preview), manda esa.
import { spawn } from "node:child_process";

const port = process.env.PORT || process.argv[2] || "3003";
const child = spawn("next", ["dev", "--port", port], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
