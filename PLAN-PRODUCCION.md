# Plan: brosbefore en producción
_Última actualización: 2026-10-20 · Modo: Estándar_

## ▶ Siguiente acción
> En la cuenta de Cloudflare del dominio (`brosbeforefilm.com`), crear los dos Workers desde Git:
> `brosbefore-web` y `brosbefore-admin` (pasos y comandos en el README, sección "Despliegue en Cloudflare").
> Conectar `brosbeforefilm.com` y `admin.brosbeforefilm.com`, y proteger el admin con Cloudflare Access.
> Después, desactivar el workflow de GitHub Pages.

## Objetivo y definición de listo
**Objetivo:** que brosbefore tenga su propia web comercial, con portal de clientes y admin, y deje de depender de Pixieset ($24/mes) por un costo menor.

**Listo significa:** `brosbeforefilm.com` sirve desde Cloudflare la web pública, el portal de clientes y el admin; el contenido de la web se edita desde el admin; y al menos **una pareja real** entró con un enlace mágico, vio su galería privada y descargó sus fotos y su film, con respaldos funcionando.

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
| 1 | **Fundaciones** | Dominio comprado; repo privado (monorepo); la web actual portada a Next.js y desplegada sola en Cloudflare Workers (assets estáticos) en `brosbeforefilm.com` | M | 🔄 En curso: dominio comprado, web portada; falta crear los Workers |
| 2 | **Datos y admin de contenido** | Esquema en Supabase con RLS; `admin.brosbeforefilm.com` protegido con Cloudflare Access; desde el admin se crean y editan las bodas del portafolio, y la web pública las lee de Supabase | M | ⏸ Pendiente |
| 3 | **Fotos y videos en R2** | El admin sube fotos y videos directo a R2 (URLs firmadas, subida multiparte para videos); los 3 tamaños por foto se generan en el navegador; el portafolio carga las imágenes desde R2 | M | ⏸ Pendiente |
| 4 | **Portal de clientes** | Una pareja de prueba entra con enlace mágico (correo vía Resend), ve **solo** su galería, reproduce el film y descarga todo en .zip; un test comprueba que la pareja A no puede ver la galería de la pareja B | L | ⏸ Pendiente |
| 5 | **Salida a producción** | Respaldos semanales y cron anti-pausa funcionando; las galerías de Pixieset migradas (menos de 10); `brosbeforefilm.com` apunta a la versión nueva; primera pareja real atendida; Pixieset cancelado | M | ⏸ Pendiente |

## Tareas del hito actual
Hito 1: Fundaciones
- [x] Comprar `brosbeforefilm.com` en Cloudflare Registrar, con renovación automática → resultado: dominio activo en el panel de Cloudflare.
- [ ] Activar **Email Routing** para `hola@brosbeforefilm.com`, reenviando al correo de alguno de los socios → resultado: un correo de prueba enviado a `hola@` llega a la bandeja.
- [ ] Crear las cuentas de **GitHub** (o una organización `brosbefore`), **Supabase** y **Resend** con `hola@brosbeforefilm.com`, y guardar los accesos en un gestor de contraseñas compartido entre los socios → resultado: los socios pueden entrar a las tres cuentas.
- [x] ~~Apuntar el dominio a GitHub Pages~~ → descartado: la web va directo a Cloudflare.
- [x] Monorepo con pnpm + Turborepo (`apps/web`, `apps/admin`, `packages/core`) → `pnpm dev` levanta web (3003) y admin (3004).
- [ ] Crear los Workers `brosbefore-web` y `brosbefore-admin` desde Git, con **assets estáticos** (`wrangler.jsonc` ya está en el repo; sin OpenNext) → resultado: ambos publicados en `*.workers.dev`.
- [ ] Conectar `brosbeforefilm.com` (y `www`) a la web y `admin.brosbeforefilm.com` al admin, y proteger el admin con Access (también su `*.workers.dev`) → resultado: ambos dominios abren y el admin pide acceso.
- [x] Home portada a Next.js (carrusel 3D, detalle y sonido).
- [x] Nosotros, Planes (`/pricing` redirige), navbar, menú y tema claro/oscuro portados.
- [ ] Si algún día hay código de servidor: revisar el *CPU time* en *Workers → Metrics* (hoy no aplica: la web es estática).

(Los demás hitos se detallan cuando toque, no antes.)

## Costos por etapa
| Etapa | Qué se paga | Costo aprox. |
|---|---|---|
| Hitos 1–3 (construcción) | Dominio | ~$1/mes ($10–12 al año) |
| Hito 4 (solo si el código de Workers pasa de 10 ms de CPU) | + Workers Paid | +$5/mes |
| Hito 5 (clientes reales) | + Supabase Pro (respaldos diarios, sin pausa) + R2 (~$15/TB) | ~$35–45/mes con 1 TB |
| Al cancelar Pixieset | − $24/mes | |

## Riesgos y supuestos
**Riesgos:**
| Riesgo | Señal temprana | Plan B |
|--------|----------------|--------|
| Hace falta render en servidor (páginas de parejas nuevas sin rebuild) | El admin crea una pareja y su ficha no existe hasta el próximo build | Cargar la ficha en el cliente desde Supabase, o pasar esa parte a OpenNext en Workers; último recurso: Vercel Pro ($20/mes) |
| Los Workers con código superan los 10 ms de CPU del plan gratis | Errores "exceeded CPU" en las métricas | Pasar a Workers Paid ($5/mes). Los assets estáticos no cuentan |
| Fotos de clientes filtradas a otra persona | El test "pareja A no ve B" falla, o el bucket de R2 queda público | Bucket privado con URLs firmadas de vida corta; el test corre en cada despliegue |
| Pérdida de datos o de fotos | El proyecto de Supabase aparece "paused", o un respaldo semanal no se genera | Cron diario + `pg_dump` semanal a R2; segunda copia de los originales en B2 o en un disco propio; Supabase Pro al tener clientes |
| Subir films grandes (5–10 GB) falla desde el admin | Falla la subida de prueba de un film real en el hito 3 | Subida multiparte que se puede reanudar; plan B: subir con `rclone` desde la computadora |
| Los enlaces mágicos caen en spam | La prueba con Gmail y Outlook termina en spam | SPF, DKIM y DMARC del dominio en Resend; plan B: contraseña por galería |

**Supuestos por validar:**
- [ ] `brosbeforefilm.com` está disponible — validar antes de: la primera tarea.
- [ ] Una boda pesa entre 10 y 20 GB (fotos + film) — validar con una boda real antes de: hito 3.
- [ ] Las parejas aceptan entrar con enlace mágico, sin contraseña — validar antes de: hito 4.
- [ ] El film se puede ver y descargar desde R2 en .mp4 (YouTube bloquea los embeds de films con música con copyright) — validar antes de: hito 4.
- [ ] La construcción cabe en los planes gratis (Workers, Supabase, Resend) — validar durante: hitos 1–3.

## Registro de decisiones
| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-10-04 | Hosting en **Cloudflare**, no en Vercel | El plan gratis de Vercel prohíbe el uso comercial; Pro cuesta $20/mes por persona |
| 2026-10-04 | Base de datos y login en **Supabase (Postgres)**, no MySQL | Incluye login, RLS y panel; con MySQL habría que integrar otro servicio de login |
| 2026-10-04 | Archivos en **R2**, no S3; **B2** como archivo más adelante | S3 cobra cada descarga; R2 no; B2 cuesta la mitad para guardar bodas viejas |
| 2026-10-04 | **1 monorepo privado** con 2 apps desplegadas por separado | La seguridad viene de las llaves separadas, RLS y Cloudflare Access, no de tener varios repos |
| 2026-10-04 | Tamaños de foto generados en el navegador del admin; .zip armado en el navegador del cliente | Evita pagar procesamiento en servidor |
| 2026-10-04 | Dominio `.com` en Cloudflare Registrar | Precio de costo, privacidad WHOIS gratis y todo integrado |
| 2026-10-04 | Las galerías de Pixieset (menos de 10) se migran a mano en el hito 5 | Son pocas; no vale la pena una herramienta de migración |

## Decisiones del 2026-10-20
| Fecha | Decisión | Razón |
|---|---|---|
| 2026-10-20 | Dominio real: **`brosbeforefilm.com`** (web) y `admin.brosbeforefilm.com` (admin) | Reemplaza a `brosbefore.com` |
| 2026-10-20 | **Workers con assets estáticos** (`wrangler.jsonc` en `apps/web` y `apps/admin`), sin OpenNext por ahora | Las dos apps son `output: "export"`; las requests de assets son gratis e ilimitadas y no hay riesgo de CPU |
| 2026-10-20 | Se mantiene **1 monorepo privado**; con el backend se evalúa separar solo la API | La seguridad viene de Access, RLS y llaves en variables de entorno, no de repos separados |
| 2026-10-20 | Login y datos van directo a Supabase (RLS); Workers solo firma URLs de R2 y corre crons | Menos código de servidor y menos costo |
| 2026-10-20 | Rate limiting: 1 regla gratis de WAF para la futura ruta de API; el binding `ratelimits` cuando exista un Worker con código | Hoy no hay código que limitar; en plan gratis, pasar el tope no genera cargos |

## Ritual de mantenimiento
- **Al empezar cada sesión (5–10 min):** leer "Siguiente acción", confirmar que sigue teniendo sentido y ejecutarla.
- **Al cerrar cada sesión:** reescribir "Siguiente acción" para quien retome (tú mismo o un socio).
- **Al cumplir un hito:** marcarlo ✅, bajar el siguiente a tareas de 2 horas o menos, actualizar riesgos y anotar las decisiones tomadas.
- **Nunca:** rehacer todo el plan porque una semana salió mal. Se ajusta el hito actual y se sigue.
