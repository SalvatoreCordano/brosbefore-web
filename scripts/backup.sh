#!/usr/bin/env bash
# Respaldo cifrado de la base de Supabase en R2. Lo corre .github/workflows/backup.yml cada semana;
# también se puede correr a mano con las variables de abajo. Guía completa: docs/RESPALDOS.md.
#
#   DB_URL                 conexión del usuario backup_reader (Session pooler de Supabase)
#   AGE_PUBKEY             clave pública age: solo quien tenga la privada puede abrir los respaldos
#   R2_ENDPOINT            https://<id-de-cuenta>.r2.cloudflarestorage.com
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   token de R2 limitado al bucket de respaldos
#   BACKUP_BUCKET          (opcional) por defecto brosbefore-backups
set -euo pipefail

need() {
  for v in "$@"; do
    [ -n "${!v:-}" ] || { echo "Falta la variable $v" >&2; exit 1; }
  done
}
need DB_URL AGE_PUBKEY R2_ENDPOINT AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

BUCKET="${BACKUP_BUCKET:-brosbefore-backups}"
STAMP="$(date -u +%Y-%m-%d_%H%M)"
DIR="$(mktemp -d)"
trap 'rm -rf "$DIR"' EXIT
# R2 no acepta las sumas de verificación nuevas del AWS CLI
export AWS_DEFAULT_REGION=auto AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required

# 1) Toda tabla pública necesita la política de lectura del respaldo; si falta, saldría incompleto sin avisar.
missing="$(psql "$DB_URL" -Atc "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.policyname = 'backup_read')")"
if [ -n "$missing" ]; then
  echo "Tablas sin política de respaldo: $(echo "$missing" | tr '\n' ' ')- vuelve a ejecutar supabase/ops/backup_role.sql" >&2
  exit 1
fi

# 2) La base (estructura, reglas y datos) y, aparte, las cuentas.
pg_dump "$DB_URL" --format=custom --no-owner --no-privileges --enable-row-security --schema=public --file="$DIR/app.dump"
pg_dump "$DB_URL" --format=custom --no-owner --no-privileges --enable-row-security --data-only -t auth.users -t auth.identities --file="$DIR/auth.dump"

# 3) Que no estén vacíos y que traigan los datos de las parejas.
for f in app auth; do
  [ "$(stat -c %s "$DIR/$f.dump")" -gt 1024 ] || { echo "El respaldo $f salió vacío" >&2; exit 1; }
done
pg_restore --list "$DIR/app.dump" | grep -q "TABLE DATA public couples" || { echo "El respaldo no incluye la tabla couples" >&2; exit 1; }

# 4) Se cifra antes de salir de esta máquina y se sube; el archivo sin cifrar se borra enseguida.
for f in app auth; do
  age -r "$AGE_PUBKEY" -o "$DIR/$f.dump.age" "$DIR/$f.dump"
  rm -f "$DIR/$f.dump"
  aws s3 cp "$DIR/$f.dump.age" "s3://$BUCKET/db/$STAMP/$f.dump.age" --endpoint-url "$R2_ENDPOINT" --only-show-errors
  echo "Subido db/$STAMP/$f.dump.age ($(stat -c %s "$DIR/$f.dump.age") bytes)"
done
