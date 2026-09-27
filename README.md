# (brosbefore)™ — web

Sitio de (brosbefore)™, fotografía y film de bodas.

HTML/CSS/JS puro, sin build.

```bash
npx http-server -p 5173 -c-1
```

## Rutas

| URL | Archivo |
|---|---|
| `/` | `index.html` — home con carrusel 3D y detalle de cada cobertura (`/#/<id>`) |
| `/nosotros` | `nosotros.html` |
| `/pricing` | `pricing.html` |

Las URLs sin `.html` las resuelve el hosting (GitHub Pages y `http-server` lo hacen solos).
Si alguien entra con `.html`, `js/nav.js` limpia la URL.

## Archivos

- `js/data.js` — coberturas (contenido mock hasta tener fotos/videos reales)
- `js/sound.js` — sonido de proyector al pasar imágenes
