# Plan: brosbefore en producción
_Última actualización: 2026-10-04 · Modo: Estándar_

## ▶ Siguiente acción
> Entrar a **dash.cloudflare.com** con el correo del negocio → *Domain Registration → Register Domains* →
> buscar `brosbefore.com` → comprarlo con **renovación automática activada**.
> Si `.com` no está disponible, anotar las alternativas que ofrece y decidir antes de seguir (ver Supuestos).

## Objetivo y definición de listo
**Objetivo:** que brosbefore tenga su propia web comercial, con portal de clientes y admin, y deje de depender de Pixieset ($24/mes) por un costo menor.

**Listo significa:** `brosbefore.com` sirve desde Cloudflare la web pública, el portal de clientes y el admin; el contenido de la web se edita desde el admin; y al menos **una pareja real** entró con un enlace mágico, vio su galería privada y descargó sus fotos y su film, con respaldos funcionando.

**Fecha objetivo:** sin deadline. Se avanza hito por hito.

## Anti-alcance
Fuera de esta versión (no se hace aunque tiente):
- Tienda o venta de impresiones, y pagos en línea.
- Contratos, facturación o CRM. El botón "Contáctanos" abre WhatsApp o un correo, sin formulario con base de datos.
- Favoritos o selección de fotos por parte de la pareja ("proofing") y marcas de agua.
- Web en otros idiomas y app móvil.

## Hitos
| # | Hito | Criterio de salida | Tamaño | Estado |
|---|------|-------------------|--------|--------|
| 1 | **Fundaciones** | Dominio comprado; repo privado (monorepo); la web actual portada a Next.js y desplegada sola en Cloudflare Workers en `nuevo.brosbefore.com` | M | 🔄 En curso |
| 2 | **Datos y admin de contenido** | Esquema en Supabase con RLS; `admin.brosbefore.com` protegido con Cloudflare Access; desde el admin se crean y editan las bodas del portafolio, y la web pública las lee de Supabase | M | ⏸ Pendiente |
| 3 | **Fotos y videos en R2** | El admin sube fotos y videos directo a R2 (URLs firmadas, subida multiparte para videos); los 3 tamaños por foto se generan en el navegador; el portafolio carga las imágenes desde R2 | M | ⏸ Pendiente |
| 4 | **Portal de clientes** | Una pareja de prueba entra con enlace mágico (correo vía Resend), ve **solo** su galería, reproduce el film y descarga todo en .zip; un test comprueba que la pareja A no puede ver la galería de la pareja B | L | ⏸ Pendiente |
| 5 | **Salida a producción** | Respaldos semanales y cron anti-pausa funcionando; las galerías de Pixieset migradas (menos de 10); `brosbefore.com` apunta a la versión nueva; primera pareja real atendida; Pixieset cancelado | M | ⏸ Pendiente |

## Tareas del hito actual
Hito 1: Fundaciones
- [ ] Comprar `brosbefore.com` en Cloudflare Registrar, con renovación automática → resultado: dominio activo en el panel de Cloudflare.
- [ ] Activar **Email Routing** para `hola@brosbefore.com`, reenviando al correo de alguno de los socios → resultado: un correo de prueba enviado a `hola@` llega a la bandeja.
- [ ] Crear las cuentas de **GitHub** (o una organización `brosbefore`), **Supabase** y **Resend** con `hola@brosbefore.com`, y guardar los accesos en un gestor de contraseñas compartido entre los socios → resultado: los socios pueden entrar a las tres cuentas.
- [ ] Apuntar `brosbefore.com` a la web actual en GitHub Pages (con un archivo `CNAME` y los registros DNS) → resultado: el sitio actual abre en el dominio propio mientras se construye el nuevo.
- [ ] Crear el repo **privado** `brosbefore` con pnpm + Turborepo (`apps/web`, `apps/admin`, `packages/db`, `packages/ui`) → resultado: `pnpm dev` levanta las dos apps en local.
- [ ] Conectar `apps/web` a Cloudflare Workers con OpenNext y despliegue automático desde `main` → resultado: un "hola mundo" publicado en `*.workers.dev`.
- [ ] Conectar `nuevo.brosbefore.com` al Worker → resultado: el subdominio abre la app de Next.js.
- [ ] Portar la home (carrusel 3D, vista de detalle y sonido) a Next.js → resultado: la home se ve y funciona igual que hoy en `nuevo.brosbefore.com`.
- [ ] Portar Nosotros, Pricing, el navbar, el menú y el tema claro/oscuro, con rutas `/`, `/nosotros` y `/pricing` → resultado: las 3 rutas funcionan en el subdominio.
- [ ] Revisar el *CPU time* de la home en *Workers → Metrics* → resultado: valor anotado en el Registro de decisiones (¿alcanza el plan gratis?).

(Los demás hitos se detallan cuando toque, no antes.)

## Costos por etapa
| Etapa | Qué se paga | Costo aprox. |
|---|---|---|
| Hitos 1–3 (construcción) | Dominio | ~$1/mes ($10–12 al año) |
| Hito 4 (si Workers pasa de 10 ms de CPU) | + Workers Paid | +$5/mes |
| Hito 5 (clientes reales) | + Supabase Pro (respaldos diarios, sin pausa) + R2 (~$15/TB) | ~$35–45/mes con 1 TB |
| Al cancelar Pixieset | − $24/mes | |

## Riesgos y supuestos
**Riesgos:**
| Riesgo | Señal temprana | Plan B |
|--------|----------------|--------|
| Next.js no funciona bien en Workers (OpenNext) | Falla el build o hay errores en una función de Next.js en el hito 1 | Generar como estáticas las páginas que se pueda; el último recurso es Vercel Pro ($20/mes) |
| Las páginas superan los 10 ms de CPU del plan gratis | Errores "exceeded CPU" o un CPU time cercano a 8 ms en las métricas | Pasar a Workers Paid ($5/mes) |
| Fotos de clientes filtradas a otra persona | El test "pareja A no ve B" falla, o el bucket de R2 queda público | Bucket privado con URLs firmadas de vida corta; el test corre en cada despliegue |
| Pérdida de datos o de fotos | El proyecto de Supabase aparece "paused", o un respaldo semanal no se genera | Cron diario + `pg_dump` semanal a R2; segunda copia de los originales en B2 o en un disco propio; Supabase Pro al tener clientes |
| Subir films grandes (5–10 GB) falla desde el admin | Falla la subida de prueba de un film real en el hito 3 | Subida multiparte que se puede reanudar; plan B: subir con `rclone` desde la computadora |
| Los enlaces mágicos caen en spam | La prueba con Gmail y Outlook termina en spam | SPF, DKIM y DMARC del dominio en Resend; plan B: contraseña por galería |

**Supuestos por validar:**
- [ ] `brosbefore.com` está disponible — validar antes de: la primera tarea.
- [ ] Una boda pesa entre 10 y 20 GB (fotos + film) — validar con una boda real antes de: hito 3.
- [ ] Las parejas aceptan entrar con enlace mágico, sin contraseña — validar antes de: hito 4.
- [ ] El film se puede ver y descargar desde R2 en .mp4 (YouTube bloquea los embeds de films con música con copyright) — validar antes de: hito 4.
- [ ] La construcción cabe en los planes gratis (Workers, Supabase, Resend) — validar durante: hitos 1–3.

## Registro de decisiones
| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-10-04 | Hosting en **Cloudflare Workers**, no en Vercel | El plan gratis de Vercel prohíbe el uso comercial; Pro cuesta $20/mes por persona |
| 2026-10-04 | Base de datos y login en **Supabase (Postgres)**, no MySQL | Incluye login, RLS y panel; con MySQL habría que integrar otro servicio de login |
| 2026-10-04 | Archivos en **R2**, no S3; **B2** como archivo más adelante | S3 cobra cada descarga; R2 no; B2 cuesta la mitad para guardar bodas viejas |
| 2026-10-04 | **1 monorepo privado** con 2 apps desplegadas por separado | La seguridad viene de las llaves separadas, RLS y Cloudflare Access, no de tener varios repos |
| 2026-10-04 | Tamaños de foto generados en el navegador del admin; .zip armado en el navegador del cliente | Evita pagar procesamiento en servidor |
| 2026-10-04 | Dominio `.com` en Cloudflare Registrar | Precio de costo, privacidad WHOIS gratis y todo integrado |
| 2026-10-04 | Las galerías de Pixieset (menos de 10) se migran a mano en el hito 5 | Son pocas; no vale la pena una herramienta de migración |

## Ritual de mantenimiento
- **Al empezar cada sesión (5–10 min):** leer "Siguiente acción", confirmar que sigue teniendo sentido y ejecutarla.
- **Al cerrar cada sesión:** reescribir "Siguiente acción" para quien retome (tú mismo o un socio).
- **Al cumplir un hito:** marcarlo ✅, bajar el siguiente a tareas de 2 horas o menos, actualizar riesgos y anotar las decisiones tomadas.
- **Nunca:** rehacer todo el plan porque una semana salió mal. Se ajusta el hito actual y se sigue.
