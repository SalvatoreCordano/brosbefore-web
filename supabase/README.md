# Supabase

Base de datos y accesos de brosbefore. Proyecto: `nscibtisjzfflnjhwhwi`.

## Preparar el proyecto (una sola vez)

1. **Esquema y planes:** en *SQL Editor*, pegar y ejecutar en orden los archivos de `migrations/`
   (`..._init.sql` y después `..._seed_plans.sql`). Ejecutarlos dos veces falla a propósito.
2. **Correo sin confirmación:** *Authentication → Sign In / Providers → Email* → desactivar **Confirm email**.
   La pareja demuestra que el correo es suyo con el enlace de invitación, así que no hace falta otro paso.
   Dejar el registro abierto es seguro: una cuenta sin invitación no puede leer ni escribir nada (RLS).
3. **Primer admin:** *Authentication → Users → Add user* (correo y contraseña, marcar *Auto Confirm User*).
   Después, en el SQL Editor:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'correo-del-admin@…';
   ```
   Repetir para cada persona del equipo.
4. **Conectar las apps:** en Cloudflare, en las **variables de compilación** de los dos Workers, agregar
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (la llave *anon*, que es pública) y relanzar el build.
   Sin esas variables las apps usan el modo demo con datos de ejemplo.

**Nunca** poner la llave `service_role` en variables `NEXT_PUBLIC_*` ni en el repo.

## Probar en local contra Supabase

Crear `apps/web/.env.local` y `apps/admin/.env.local` (están ignorados por git) con las dos variables de arriba.
Para volver al modo demo, borrar esos archivos.

## Reglas de acceso (RLS)

| Quién | Qué ve |
|---|---|
| Público | Parejas en galería, sus fichas y las fotos que se eligieron para la web |
| Pareja (con invitación aceptada) | Solo su historia: archivos publicados y la presentación publicada |
| Admin (tabla `admins`) | Todo, y es el único que escribe |

`pnpm test` corre las reglas en un Postgres embebido (`packages/core/tests/rls.test.mjs`), incluido
que la pareja A no puede ver lo de la pareja B.
