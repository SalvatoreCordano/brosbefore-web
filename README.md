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

Dos Workers con assets estáticos, creados desde Git (Workers & Pages → Import a repository), con la raíz del repo como carpeta de trabajo. La versión de Node sale de `.node-version` (Workers Builds usa Node 24 por defecto; este archivo la fija en 22):

| | Web | Admin |
|---|---|---|
| Nombre | `brosbefore-web` | `brosbefore-admin` |
| Build | `pnpm --filter @bb/web build` | `pnpm --filter @bb/admin build` |
| Deploy | `npx wrangler deploy --config apps/web/wrangler.jsonc` | `npx wrangler deploy --config apps/admin/wrangler.jsonc` |
| Dominio | `brosbeforefilm.com` y `www` | `admin.brosbeforefilm.com` |
| Variables extra | — | `NEXT_PUBLIC_ADMIN_PATH=/` y `NEXT_PUBLIC_WEB_URL=https://brosbeforefilm.com` |

El admin va detrás de Cloudflare Access (también su URL `*.workers.dev`). Las cabeceras y la redirección de `/pricing` están en `apps/*/public/_headers` y `_redirects`.

## Cómo trabajamos

Flujo: **rama de trabajo → PR a `development` → PR de `development` a `main`**. Cloudflare construye y publica solo al fusionar a `main`.

- **Nunca se sube directo a `main` ni a `development`.** Cada tanda se prueba en local y entra por un PR a `development`. Cuando lo acumulado está aprobado, un segundo PR lleva `development` a `main`. Quien aprueba fusiona cada PR con *Squash and merge*.
- **Sin previews en Cloudflare:** no hay URL de prueba por rama. Se prueba en local y con el CI.
- **El CI revisa cada PR** (a `development` y a `main`; `.github/workflows/ci.yml`): `pnpm typecheck`, `pnpm test` y `pnpm build`. Un error se ve en el PR, no en un build fallido de producción.
- **`main` y `development` protegidas** (GitHub, Settings → Rules → Rulesets): exigir PR, bloquear force-push y borrado, y exigir el check `check` del CI.
- **Ramas de trabajo:** `feat/…`, `fix/…`, `chore/…`, creadas desde `development`. `main` es producción.
- **Migraciones de Supabase** (`supabase/migrations/`): una por cambio, con fecha en el nombre. Se ejecutan a mano en el SQL Editor al fusionar a `main`; el PR lo avisa.

### Ajustes de Cloudflare que no viven en el repo

En cada Worker (`brosbefore-web` y `brosbefore-admin`), en **Settings → Build**:

| Ajuste | Valor | Para qué |
|---|---|---|
| Branch control → **Builds para ramas de vista previa** (*Enable Preview Builds*) | Desactivado | Ninguna rama ni PR dispara build: solo se construye al fusionar a `main` |
| **Build watch paths** (rutas a vigilar) | Web: `apps/web`, `packages/core`, `assets`, `pnpm-lock.yaml`. Admin: `apps/admin`, `packages/core`, `assets`, `pnpm-lock.yaml` | Un cambio en el admin o en los docs no reconstruye la web |
| **Build caching** | Activado | Reutiliza dependencias entre builds |
| Variable `NODE_VERSION` | Ya no hace falta (la fija `.node-version`) | Una sola fuente de verdad |

Los assets estáticos (HTML, imágenes, fuentes) no cuentan en el límite de requests de Workers.

## Pantalla de construcción

Mientras se arma el sitio, en **producción** la raíz de la web y del admin muestran una pantalla con solo el logo (sin enlaces). Se entra a mano:

| Dónde | Ruta | Qué abre |
|---|---|---|
| Web | `/web` | Todo el sitio (deja una marca en el navegador para no volver a pedirla) |
| Web | `/portal` | Solo el portal de clientes (sirve también el enlace de invitación, sin entrar antes) |
| Admin | `/admin` | El admin (después sigue el login) |

Es una barrera de navegación, **no seguridad**: quien conozca la ruta entra. La protección real del admin es Cloudflare Access y el login. En local no se activa; para probarla, `NEXT_PUBLIC_UNDER_CONSTRUCTION=1`. **Para abrir el sitio al público:** variable de compilación `NEXT_PUBLIC_UNDER_CONSTRUCTION=0` en los dos Workers (y en el workflow de GitHub Pages) y relanzar el build.
