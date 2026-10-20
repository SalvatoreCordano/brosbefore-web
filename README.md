# (brosbefore)™ — web

Sitio de (brosbefore)™, fotografía y film de bodas.

Monorepo de Next.js (`apps/`, `packages/`), hoy un mock interactivo con datos de ejemplo. GitHub Pages lo publica desde `main`; la migración a Cloudflare Workers (`brosbeforefilm.com`) está en curso, ver `PLAN-PRODUCCION.md`.

## Monorepo (Next.js)

Requiere Node 22 y pnpm 9.

```bash
pnpm install
pnpm dev            # web y admin a la vez → todo en http://localhost:3003 (admin en /admin)
pnpm build          # export estático de las dos apps en apps/*/out
```

| Carpeta | Qué es |
|---|---|
| `apps/web` | Web pública y portal de clientes |
| `apps/admin` | Admin interno (se sirve en `/admin`) |
| `packages/core` | Modelo de datos, datos de ejemplo, capa de datos (`repo`), almacenamiento y utilidades de archivos |

| Ruta | Pantalla |
|---|---|
| `/` | Home: carrusel del portafolio, "Ver galería", "Ver historia completa" |
| `/galeria` · `/galeria/{pareja}` | Galería con filtro por cobertura · ficha pública de la pareja |
| `/nosotros` · `/planes` | Con sus llamados a Galería / Planes / Conócenos (`/pricing` redirige a `/planes`) |
| `/portal` | Portal de la pareja: Presentación, Archivos (descargas .zip) y Agradecimiento |
| `/portal/login` · `/portal/registro?token=` · `/portal/recuperar` | Acceso (solo por invitación) |
| `/admin` | Métricas · Parejas · Portafolio · Editor de historia (`/admin/historia?id=`) |

**Cuentas de la demo** (también aparecen en la pantalla de login): ver `DEMO_ACCOUNTS` en
`packages/core/src/seed/index.ts`. En el admin, "Restablecer demo" vuelve a los datos de ejemplo.

- **Datos:** todas las pantallas leen y escriben por `repo` (`packages/core/src/repo.ts`). Hoy es `MockRepo` (`localStorage` + archivos en IndexedDB del navegador); en `sandbox` se reemplaza por Supabase + R2 sin tocar las pantallas.
- **Datos de ejemplo:** `packages/core/src/seed/` (parejas originales en `legacy-works.ts`) más ejemplos de pedida, preboda, cuentas y testimonios.
- **Imágenes:** la fuente es `/assets`; cada app la copia a su `public/assets` al arrancar (no se commitea).
- **Admin en local:** corre en el puerto 3004, pero la web lo sirve en `localhost:3003/admin` para que ambos compartan los datos de la demo (mismo origen).
- **Publicar:** `.github/workflows/demo-pages.yml` (web en la raíz, admin en `/admin`), solo desde `main`. Usa `NEXT_PUBLIC_BASE_PATH`.


## Despliegue en Cloudflare

Dos Workers con assets estáticos, creados desde Git (Workers & Pages → Import a repository), con la raíz del repo como carpeta de trabajo y la variable `NODE_VERSION=22`:

| | Web | Admin |
|---|---|---|
| Nombre | `brosbefore-web` | `brosbefore-admin` |
| Build | `pnpm --filter @bb/web build` | `pnpm --filter @bb/admin build` |
| Deploy | `npx wrangler deploy --config apps/web/wrangler.jsonc` | `npx wrangler deploy --config apps/admin/wrangler.jsonc` |
| Dominio | `brosbeforefilm.com` y `www` | `admin.brosbeforefilm.com` |
| Variables extra | — | `NEXT_PUBLIC_ADMIN_PATH=/` y `NEXT_PUBLIC_WEB_URL=https://brosbeforefilm.com` |

El admin va detrás de Cloudflare Access (también su URL `*.workers.dev`). Las cabeceras y la redirección de `/pricing` están en `apps/*/public/_headers` y `_redirects`.

## Pantalla de construcción

Mientras se arma el sitio, en **producción** la raíz de la web y del admin muestran una pantalla con solo el logo (sin enlaces). Se entra a mano:

| Dónde | Ruta | Qué abre |
|---|---|---|
| Web | `/web` | Todo el sitio (deja una marca en el navegador para no volver a pedirla) |
| Web | `/portal` | Solo el portal de clientes (sirve también el enlace de invitación, sin entrar antes) |
| Admin | `/admin` | El admin (después sigue el login) |

Es una barrera de navegación, **no seguridad**: quien conozca la ruta entra. La protección real del admin es Cloudflare Access y el login. En local no se activa; para probarla, `NEXT_PUBLIC_UNDER_CONSTRUCTION=1`. **Para abrir el sitio al público:** variable de compilación `NEXT_PUBLIC_UNDER_CONSTRUCTION=0` en los dos Workers (y en el workflow de GitHub Pages) y relanzar el build.
