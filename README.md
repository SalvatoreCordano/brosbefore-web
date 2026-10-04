# (brosbefore)™ — web

Sitio de (brosbefore)™, fotografía y film de bodas.

En la rama `development` conviven dos cosas:

- **El sitio estático actual** (raíz: `index.html`, `css/`, `js/`, `assets/`). Es lo que publica GitHub Pages desde `main`.
- **El monorepo de Next.js** (`apps/`, `packages/`): la versión nueva, hoy un mock interactivo con datos de ejemplo.

## Monorepo (Next.js)

Requiere Node 22 y pnpm 9.

```bash
pnpm install
pnpm dev            # web (puerto 3000) y admin (3001) a la vez
pnpm dev:web        # solo la web
pnpm dev:admin      # solo el admin
pnpm build          # export estático de las dos apps en apps/*/out
```

| Carpeta | Qué es |
|---|---|
| `apps/web` | Web pública (home, `/nosotros`, `/planes`) y, más adelante, galería y portal de clientes |
| `apps/admin` | Admin interno: métricas, parejas, portafolio |
| `packages/core` | Modelo de datos, datos de ejemplo y capa de datos (`repo`) compartidos |

- **Datos:** todas las pantallas leen y escriben por `repo` (`packages/core/src/repo.ts`). Hoy es `MockRepo`, que guarda en `localStorage`; en `sandbox` se reemplaza por Supabase sin tocar las pantallas.
- **Datos de ejemplo:** salen de `js/data.js`. Si cambia el contenido en `main`, traerlo y correr `pnpm seed:sync`.
- **Imágenes:** la fuente es `/assets`; cada app la copia a su `public/assets` al arrancar (no se commitea).
- **Web y admin en local:** corren en puertos distintos, así que no comparten los datos de la demo. Publicados en el mismo dominio (GitHub Pages o Cloudflare), sí los comparten.
- **Subruta:** para publicar bajo una ruta (ej. GitHub Pages) se define `NEXT_PUBLIC_BASE_PATH=/brosbefore-web/demo` al hacer `build`.

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
