# (brosbefore)™ — web

Sitio de (brosbefore)™, fotografía y film de bodas.

En la rama `development` conviven dos cosas:

- **El sitio estático actual** (raíz: `index.html`, `css/`, `js/`, `assets/`). Es lo que publica GitHub Pages desde `main`.
- **El monorepo de Next.js** (`apps/`, `packages/`): la versión nueva, hoy un mock interactivo con datos de ejemplo.

## Monorepo (Next.js)

Requiere Node 22 y pnpm 9.

```bash
pnpm install
pnpm dev            # web y admin a la vez → todo en http://localhost:3000 (admin en /admin)
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
- **Datos de ejemplo:** salen de `js/data.js` más ejemplos de pedida, preboda, cuentas y testimonios. Si cambia el contenido en `main`, traerlo y correr `pnpm seed:sync`.
- **Imágenes:** la fuente es `/assets`; cada app la copia a su `public/assets` al arrancar (no se commitea).
- **Admin en local:** corre en el puerto 3001, pero la web lo sirve en `localhost:3000/admin` para que ambos compartan los datos de la demo (mismo origen).
- **Publicar la demo:** workflow manual `.github/workflows/demo-pages.yml` (sitio actual en la raíz, demo en `/demo`, admin en `/demo/admin`). Usa `NEXT_PUBLIC_BASE_PATH`.

## Sitio estático (actual)

HTML/CSS/JS puro, sin build.

```bash
npx http-server -c-1
```

| URL | Archivo |
|---|---|
| `/` | `index.html` — home con carrusel 3D y detalle de cada cobertura (`/#/<id>`) |
| `/nosotros` | `nosotros.html` |
| `/pricing` | `pricing.html` |

Las URLs sin `.html` las resuelve el hosting (GitHub Pages y `http-server` lo hacen solos).
Si alguien entra con `.html`, `js/nav.js` limpia la URL.

- `js/data.js` — coberturas
- `js/sound.js` — sonido de proyector al pasar imágenes
