# Worker de archivos (R2)

Sube y entrega los archivos de las parejas. Dos buckets de R2:

| Bucket | Qué guarda | Quién lo lee |
|---|---|---|
| `brosbefore-private` | El **original** (`o/<id>`) y una **versión ligera** (`p/<id>`, WebP de 1600 px) de cada foto; videos y entregables | Solo con un enlace firmado que este Worker entrega si Supabase lo permite (admin: todo; pareja: lo suyo publicado) |
| `brosbefore-public` | La versión ligera de las fotos elegidas para galería/portafolio, y recursos públicos (`a/<id>`: banner, canción) | Todos, directo desde `cdn.brosbeforefilm.com` (sin pasar por el Worker) |

El original nunca llega al bucket público. Las versiones ligeras se generan en el navegador al subir
(también borra los datos EXIF, como la ubicación).

Quién puede qué lo decide Supabase (`is_admin()` y `readable_keys()`, migración `20261021000000_storage.sql`),
con la sesión de quien pide; el Worker no guarda ninguna regla propia ni credenciales de la base.

## Puesta en marcha (una sola vez)

1. **Migración:** en el SQL Editor de Supabase, ejecutar `supabase/migrations/20261021000000_storage.sql`.
2. **R2:** en Cloudflare → *R2 Object Storage* → activar (puede pedir método de pago; es gratis hasta 10 GB) y crear
   dos buckets: `brosbefore-private` y `brosbefore-public`. En ninguno activar *Public Development URL* (r2.dev).
3. **Dominio público:** en `brosbefore-public` → *Settings → Custom Domains* → `cdn.brosbeforefilm.com`.
4. **Worker:** *Workers & Pages → Create → Import a repository* → este repo, nombre **`brosbefore-api`**.
   - Build command: `pnpm install --frozen-lockfile`
   - Deploy command: `npx wrangler deploy --config apps/api/wrangler.jsonc`
   - Root: `/` · Build watch paths: `apps/api/*` · Preview builds: desactivados.
5. **Secreto:** en el Worker → *Settings → Variables and Secrets* → agregar `SIGNING_SECRET` (tipo *Secret*) con un texto
   aleatorio largo (por ejemplo, el resultado de `openssl rand -base64 48`). Firma los enlaces de lectura.
6. **Dominio del Worker:** *Settings → Domains & Routes → Custom domain* → `api.brosbeforefilm.com`.
7. **Conectar las apps:** en las variables de compilación de los Workers `brosbefore-web` y `brosbefore-admin` agregar
   `NEXT_PUBLIC_API_URL=https://api.brosbeforefilm.com` y `NEXT_PUBLIC_CDN_URL=https://cdn.brosbeforefilm.com`,
   y relanzar el build de los dos.

Hasta el paso 7, subir archivos desde el admin avisa que falta conectar el Worker.

## Límites a tener presentes

- **Tope de espacio:** el Worker rechaza subidas cuando lo guardado (suma de `files.size_bytes` + 10 %) llega a
  `CAP_BYTES` (9 GB, en `wrangler.jsonc`), para quedarse dentro de los 10 GB gratis. Es aproximado: no mide las
  versiones ligeras ni las copias públicas, de ahí el margen. Para ampliar, subir `CAP_BYTES` (pasados los 10 GB R2 cobra
  unos US$0.015 por GB al mes).
- **Plan gratis de Workers:** 100.000 peticiones al día y cuerpos de hasta 100 MB; por eso los videos suben en partes de 50 MB.
  Pasado el límite diario las peticiones fallan, no se cobra.
- **Fotos:** solo JPG, PNG y WebP (el navegador no lee HEIC ni RAW para armar la versión ligera).
- **Videos públicos:** las galerías y el portafolio muestran videos de YouTube (`externalUrl`); un video guardado en R2 solo lo ven
  la pareja y el admin.
- **Recursos públicos** (banner de presentación, canción): quedan en el bucket público con un nombre imposible de adivinar,
  pero quien tenga el enlace los abre sin iniciar sesión.
- **Copias públicas:** se crean al elegir una foto y se quitan al soltarla. Si esa llamada falla, el admin ve el error y
  basta con volver a elegir la foto.
