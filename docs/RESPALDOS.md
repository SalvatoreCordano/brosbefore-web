# Respaldos de la base

Cada lunes, GitHub Actions (`.github/workflows/backup.yml`) saca una copia de la base de Supabase, la **cifra** y la sube a un
bucket **privado** de R2. También se puede lanzar a mano. Lo hace `scripts/backup.sh`.

| Archivo en el bucket | Qué trae |
|---|---|
| `db/<fecha>/app.dump.age` | Todo el esquema `public`: tablas, datos, reglas de acceso (RLS), funciones y vistas |
| `db/<fecha>/auth.dump.age` | Las cuentas (`auth.users` y `auth.identities`): correos y claves cifradas, para recuperar los accesos |

**No incluye las fotos ni los videos.** Los originales viven solo en el bucket `brosbefore-private`: conserva copia propia de lo
importante y no borres ese bucket.

## Puesta en marcha (una sola vez)

Los pasos 1 a 3 son de Cloudflare; el 4 y el 5, de Supabase; el 6, de GitHub. Los nombres de los botones pueden variar un poco.

1. **Bucket:** R2 → crear `brosbefore-backups` (privado, sin dominio ni r2.dev). En *Settings → Object lifecycle rules*, agregar una
   regla que borre los objetos a los 90 días (así se guardan unos tres meses de respaldos semanales).
2. **Token de R2:** R2 → *Manage API tokens* → crear un token con permiso **Object Read & Write**, limitado **solo** al bucket
   `brosbefore-backups`. Cloudflare ofrece dos tipos: de **cuenta** (*Account API token*) y de **usuario** (*User API token*).
   Usa el de **cuenta**: pertenece a la cuenta, no a una persona, y no se rompe si alguien cambia de rol o sale del equipo (el de
   usuario deja de funcionar si esa persona pierde acceso). Guarda el *Access Key ID* y el *Secret Access Key* (se muestran una vez),
   y tu *Account ID*.
3. **Clave para cifrar** (en tu computadora):
   ```bash
   age-keygen -o clave-respaldos.txt
   ```
   (`age` se baja de https://github.com/FiloSottile/age/releases.) Imprime `Public key: age1…`: esa es la pública.
   El archivo `clave-respaldos.txt` contiene la **privada**: guárdala en tu gestor de contraseñas y haz una segunda copia.
   **Sin ella no se puede abrir ningún respaldo.** Nunca la subas al repo ni a GitHub.
4. **Usuario de solo lectura en Supabase** (SQL Editor). Primero:
   ```sql
   create role backup_reader login password 'UNA-CONTRASEÑA-LARGA-Y-UNICA';
   ```
   y después pega y ejecuta `supabase/ops/backup_role.sql`. Puede leer todo y no puede escribir nada.
5. **Cadena de conexión:** Supabase → *Connect* → **Session pooler** (la conexión directa es solo IPv6 en el plan gratis y GitHub
   no la alcanza). Cambia el usuario por `backup_reader.<id-del-proyecto>` y la contraseña por la del paso 4 (si tiene símbolos,
   codifícalos como en una URL).
6. **GitHub** → *Settings → Secrets and variables → Actions*:
   - Secrets: `BACKUP_DB_URL` (la cadena del paso 5), `BACKUP_R2_ACCESS_KEY_ID` y `BACKUP_R2_SECRET_ACCESS_KEY` (paso 2).
   - Variables: `BACKUP_AGE_PUBKEY` (la clave pública del paso 3) y `R2_ACCOUNT_ID`.

Luego, *Actions → Respaldo de la base → Run workflow*. Si termina en verde, deben aparecer dos archivos en
`brosbefore-backups/db/<fecha>/`.

## Cuándo se corta solo

- **Una tabla nueva sin política de respaldo:** el respaldo se detiene con un mensaje claro (así nunca sale incompleto en silencio).
  Solución: volver a ejecutar `supabase/ops/backup_role.sql`.
- **Un respaldo vacío** o sin los datos de las parejas: no se sube.
- Si el workflow falla, GitHub te avisa por correo; revisa que lleguen.

## Restaurar

Pruébalo una vez en un proyecto de Supabase vacío y desechable antes de necesitarlo de verdad.

```bash
age -d -i clave-respaldos.txt app.dump.age > app.dump
pg_restore --no-owner --dbname "<cadena de conexión del proyecto nuevo>" app.dump
```

Las cuentas (`auth.dump.age`) se restauran igual con `--data-only` y solo si el proyecto nuevo ya tiene el esquema `auth` vacío.

## Límites

- Hasta donde sé, GitHub desactiva los workflows programados de un repo público tras 60 días sin actividad en el repo; si pasa,
  se reactiva desde la pestaña *Actions*. Y Supabase pausa los proyectos gratis tras una semana sin uso: el respaldo semanal cuenta
  como actividad. Ambos puntos son de mi conocimiento, sin verificar en tu cuenta.
- Los cambios entre un lunes y otro se pierden si la base falla ese día. Para respaldar a mano en cualquier momento: *Run workflow*.
- No se probó contra tu Supabase ni tu R2 reales: la primera ejecución manual es la prueba.
