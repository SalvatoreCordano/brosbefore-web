// Prueba scripts/backup.sh con herramientas falsas (psql, pg_dump, pg_restore, age, aws): ni base ni R2 reales.
// Comprueba el orden, que solo se suba lo cifrado, que se detenga ante un respaldo vacío o incompleto y que no imprima secretos.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// en Windows "bash" puede ser el de WSL: se prefiere el de Git
const GIT_BASH = "C:\\Program Files\\Git\\bin\\bash.exe";
const BASH = process.platform === "win32" && existsSync(GIT_BASH) ? GIT_BASH : "bash";
const hasBash = spawnSync(BASH, ["-c", "true"]).status === 0;

const SECRET_URL = "postgresql://backup_reader.abc:CLAVE-SECRETA@pooler.test:5432/postgres";
const SECRET_KEY = "R2-CLAVE-SECRETA";
let bin, log;

const fake = {
  psql: `printf '%s' "\${FAKE_MISSING:-}"`,
  pg_dump: `for a in "$@"; do case "$a" in --file=*) f="\${a#--file=}";; esac; done
head -c "\${FAKE_DUMP_SIZE:-4000}" /dev/zero > "$f"
shift; echo "pg_dump $*" >> "$FAKE_LOG"`,
  pg_restore: `echo "123; 0 1 TABLE DATA public \${FAKE_TABLE:-couples} postgres"`,
  age: `while [ $# -gt 0 ]; do case "$1" in -r) shift;; -o) out="$2"; shift;; *) in="$1";; esac; shift; done
cp "$in" "$out"`,
  aws: `echo "aws $*" >> "$FAKE_LOG"`,
};

before(() => {
  bin = mkdtempSync(join(tmpdir(), "bb-bin-"));
  log = join(bin, "calls.log");
  for (const [name, body] of Object.entries(fake)) {
    writeFileSync(join(bin, name), `#!/usr/bin/env bash\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  }
});
after(() => rmSync(bin, { recursive: true, force: true }));

function run(extra = {}) {
  writeFileSync(log, "");
  const env = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    FAKE_LOG: log,
    DB_URL: SECRET_URL,
    AGE_PUBKEY: "age1clavepublica",
    R2_ENDPOINT: "https://acct.r2.cloudflarestorage.com",
    AWS_ACCESS_KEY_ID: "id",
    AWS_SECRET_ACCESS_KEY: SECRET_KEY,
    ...extra,
  };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  const r = spawnSync(BASH, ["scripts/backup.sh"], { cwd: ROOT, env, encoding: "utf8" });
  return { ...r, calls: readFileSync(log, "utf8") };
}
const uploads = (calls) => calls.split("\n").filter((l) => l.startsWith("aws s3 cp"));

test("respaldo completo: sube solo lo cifrado, en dos archivos, y no imprime secretos", { skip: !hasBash }, () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  const up = uploads(r.calls);
  assert.equal(up.length, 2);
  assert.ok(up.every((l) => /\.dump\.age s3:\/\/brosbefore-backups\/db\/\d{4}-\d{2}-\d{2}_\d{4}\/(app|auth)\.dump\.age /.test(l)), up.join("\n"));
  assert.ok(up.every((l) => l.includes("--endpoint-url https://acct.r2.cloudflarestorage.com")));
  assert.match(r.stdout, /Subido db\/.*\/app\.dump\.age/);
  assert.match(r.stdout, /Subido db\/.*\/auth\.dump\.age/);
  assert.ok(r.calls.includes("--enable-row-security"), "respeta las reglas de acceso (el usuario de respaldo tiene su política)");
  for (const secret of [SECRET_URL, SECRET_KEY, "CLAVE-SECRETA"]) {
    assert.ok(!r.stdout.includes(secret) && !r.stderr.includes(secret), "no imprime secretos");
  }
});

test("una tabla sin política de respaldo detiene todo antes de sacar nada", { skip: !hasBash }, () => {
  const r = run({ FAKE_MISSING: "tabla_nueva\n" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /tabla_nueva/);
  assert.match(r.stderr, /backup_role\.sql/);
  assert.equal(uploads(r.calls).length, 0);
});

test("un respaldo vacío o sin los datos de las parejas no se sube", { skip: !hasBash }, () => {
  const vacio = run({ FAKE_DUMP_SIZE: "10" });
  assert.notEqual(vacio.status, 0);
  assert.match(vacio.stderr, /salió vacío/);
  const incompleto = run({ FAKE_TABLE: "otra" });
  assert.notEqual(incompleto.status, 0);
  assert.match(incompleto.stderr, /no incluye la tabla couples/);
  assert.equal(uploads(vacio.calls).length + uploads(incompleto.calls).length, 0);
});

test("sin una variable obligatoria avisa cuál falta", { skip: !hasBash }, () => {
  const r = run({ AGE_PUBKEY: undefined });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Falta la variable AGE_PUBKEY/);
  assert.equal(uploads(r.calls).length, 0);
});
