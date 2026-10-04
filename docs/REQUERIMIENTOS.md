# Requerimientos — Experiencia brosbefore
_Rama: `development` · Estado: mock implementado (web, portal y admin) · Última actualización: 2026-10-04_

> **Fase actual: mock interactivo para presentar.** Todo funciona en el navegador con datos de ejemplo:
> sin Supabase, sin R2, sin correos reales. La estructura queda lista para conectar esos servicios
> en `sandbox` y `main` según [PLAN-PRODUCCION.md](../PLAN-PRODUCCION.md).

---

## 1. Resumen

brosbefore no vende "sesiones": cuenta **la historia de una pareja**, que puede incluir hasta tres
momentos: la **pedida de mano**, la **preboda** y la **boda**. El producto tiene tres caras:

| Superficie | Para quién | Qué hace |
|---|---|---|
| **Web pública** | Futuras parejas | Muestra el portafolio y la galería de historias, Nosotros y Planes |
| **Portal de clientes** | La pareja (solo por invitación) | Ve su presentación, descarga sus archivos y deja su agradecimiento |
| **Admin interno** | El equipo brosbefore | Crea cada historia, sube los archivos, arma las presentaciones y decide qué se publica |

**Problema que resuelve:** hoy la entrega a la pareja depende de Pixieset (una galería genérica que
cuesta $24/mes) y la web no tiene forma de crecer con cada boda nueva. Con esto, cada pareja recibe
una experiencia con la marca brosbefore, y cada historia nueva alimenta la web sin tocar código.

## 2. Qué ordené o cambié de tu idea (y por qué)

1. **El orden del editor de historia.** Primero se suben los **archivos** y después se arman la
   presentación y la galería pública, porque ambas se construyen *eligiendo* entre lo que ya se
   subió. Si la presentación va primero, no hay nada que elegir.
   Orden nuevo: Datos → Archivos → Presentación → Galería pública → Agradecimientos → Acceso.
2. **"Galería" en el admin pasa a llamarse "Parejas".** Es la lista de *todas* las parejas, incluidas
   las que nunca se publican en la web y solo tienen portal. Si se llama "Galería", una pareja
   oculta parecería no existir.
3. **"Hitos del día" pasan a llamarse "Momentos"** (Preparativos, Ceremonia, Fiesta…), para no
   confundirlos con los hitos del plan de trabajo. Cada carpeta que se sube crea un momento.
4. **Un solo interruptor de "visible en galería"**, que aparece en tres lugares (lista de Parejas,
   paso Galería pública y paso Acceso). Es el mismo dato: cambiarlo en un lugar lo cambia en todos.
5. **Vista previa "como la pareja"** antes de invitar, y un **indicador de qué le falta** a cada
   historia (portada, video principal…). Evita enviar un portal incompleto.
6. **Cuándo se reproduce la portada animada.** En la home, a los 2 segundos de que la tarjeta
   queda como principal (centrada en el carrusel). En la galería, apenas el mouse pasa por encima.
   Así se ve en los dos lugares, en vez de esperar 5 segundos de hover que casi nadie haría.
7. **Login de la pareja con nombre y contraseña** (como pediste), así que se suma "Olvidé mi
   contraseña". El plan anterior proponía enlace mágico; queda reemplazado.
8. **La canción va como archivo de audio subido (MP3 o M4A), no con YouTube.** Detalle en el paso 3.

## 3. Objetivos

- **Para la pareja:** recibir su historia como una experiencia propia (música, mensaje, film y fotos
  ordenadas por momento) y descargar todo sin pedir ayuda.
- **Para el equipo:** crear una historia completa desde el admin, sin tocar código, en menos de
  30 minutos (sin contar el tiempo de subida).
- **Para el negocio:** que cada historia publicada alimente la galería pública y el portafolio, y
  que los testimonios ayuden a cerrar nuevas parejas.
- **Para la migración:** que el mock y la versión real compartan pantallas y modelo de datos, y que
  migrar sea cambiar la capa de datos, no rehacer la interfaz.

## 4. Fuera de alcance (esta versión)

| No se hace | Por qué |
|---|---|
| Tienda, venta de impresiones y pagos | No es el foco: primero la experiencia de entrega |
| Favoritos o selección de fotos por la pareja (proofing) | brosbefore entrega lo editado; no hay ronda de selección |
| Marcas de agua | El portal es privado; no aporta |
| Comentarios por foto | Los cubre la sección Agradecimiento |
| Web en otros idiomas, app móvil, notificaciones push | Más adelante |
| En el mock: correos, login y almacenamiento reales | Se simulan; llegan en `sandbox` |

## 5. Glosario

| Término | Significado |
|---|---|
| **Pareja / Historia** | La unidad principal. Todo cuelga de aquí. Una historia = una pareja. |
| **Cobertura** | Cada evento cubierto: **Boda**, **Preboda** o **Pedida** (compromiso). Mínimo 1 y máximo 3 por pareja. |
| **Momento** | Una etapa dentro de una cobertura (ej. "Ceremonia"). Se crea a partir de una carpeta subida. |
| **Archivo** | Una foto o un video subido. Pertenece a un momento. |
| **Presentación** | Lo que ve la pareja en su portal: banner, música, mensaje, videos y fotos destacadas. |
| **Ficha pública** | La página de la pareja en la web (`/galeria/{pareja}`). |
| **Galería (web)** | La página `/galeria`, con todas las historias publicadas. |
| **Portafolio** | El subconjunto de historias que aparece en el carrusel de la home. |
| **Plan** | essentials™, the story™ o the legacy™. Se muestra como etiqueta. |
| **Agradecimiento** | Texto que deja un miembro de la pareja desde el portal. Si se "repostea", aparece en su ficha pública. |

## 6. Reglas de visibilidad

Estas reglas definen qué se ve dónde. Todo el admin las respeta.

| Estado | Opciones | Efecto |
|---|---|---|
| **Visible en galería** | Sí / No | No → la pareja no aparece en `/galeria` ni en el portafolio, y su ficha pública da 404 |
| **En portafolio** | Sí / No (solo se puede activar si está visible en galería) | Sí → aparece en el carrusel de la home, con su selección reducida de fotos |
| **Portal** | Activo / Suspendido | Suspendido → la pareja puede iniciar sesión, pero ve "Presentación suspendida" |
| **Presentación** | Borrador / Publicada | La pareja solo ve la última versión **publicada**; los cambios en borrador no le llegan hasta publicar |
| **Archivos** | Borrador / Publicados | Igual: lo que se sube no aparece en "Descargas" hasta que se publica |
| **Cobertura en web** | Encendida / Apagada (por separado en galería y en portafolio) | Ej.: mostrar solo la Boda en la home aunque haya Preboda |

> Ocultar algo nunca borra nada. Lo único que borra es **Eliminar pareja** (paso 6).

---

## 7. Admin interno

### 7.1 Navegación
Menú lateral: **Métricas · Parejas · Portafolio · Planes** (P1), más el usuario y "Cerrar sesión".
En el mock se entra sin login, con un usuario de demo. En la versión real, el admin se protege con
Cloudflare Access + login.

### 7.2 Métricas
Tablero de una sola pantalla. En el mock, todos los números son ficticios.

- **P0:** parejas por estado (en galería, ocultas, portal suspendido); invitaciones enviadas y
  aceptadas; agradecimientos pendientes de revisar.
- **P0:** **almacenamiento usado** (GB totales y por pareja) y **costo estimado de R2** (~$0.015 por GB al mes). Sirve para controlar el costo del plan de escalabilidad.
- **P1:** descargas por pareja, visitas a la web y a cada ficha pública (Cloudflare Web Analytics).

### 7.3 Parejas (lista maestra, antes "Galería")
Lista de **todas** las historias.

- Cada fila muestra: portada en miniatura, nombres, fecha, **etiqueta del plan**, **coberturas**
  (íconos o chips Boda / Preboda / Pedida), **cantidad de fotos y videos**, indicador de completitud
  y estado (en galería / oculta / portal suspendido).
- Acciones por fila: **Editar** (abre el editor de historia) e **ícono de ojo** para ocultar o mostrar en la galería.
- Botón **"+ Nueva historia"**: crea la pareja y abre el editor en el paso 1.
- **P1:** búsqueda por nombre y filtros por cobertura, plan y estado.

**Criterios de aceptación**
- [ ] Al ocultar desde el ícono, la pareja desaparece de `/galeria` y del portafolio en el mismo instante.
- [ ] Una historia nueva no aparece en la web hasta que se marque como visible en galería.
- [ ] Sin parejas, la lista muestra un estado vacío con el botón "Crear la primera historia".

### 7.4 Portafolio (carrusel de la home)
Lista de las parejas que aparecen en la home.

- Cada fila: portada, nombres, etiqueta del plan, coberturas que se muestran en la home, **Editar**
  (lleva directo al paso 4, sección Portafolio) e **ícono de ojo** para sacarla del portafolio (sigue en la galería).
- **P0: ordenar arrastrando.** El orden del carrusel importa: hoy ya se cuida en `data.js`.
- Para agregar una pareja al portafolio, se activa "En portafolio" en su paso 4.

### 7.5 Editor de historia
Pantalla con **6 pasos** (pestañas o barra lateral). Se puede saltar entre pasos, pero cada uno
muestra qué le falta. Arriba, siempre visibles: los nombres de la pareja, el **indicador de
completitud** y el botón **"Vista previa como la pareja"**.

#### Paso 1 — Datos de la pareja
- **P0:** nombres (ej. "Ceziel & Gianfranco"), **plan**, lugar, fecha de la boda y **coberturas
  contratadas** (casillas Boda / Preboda / Pedida, mínimo 1). Cada cobertura tiene su propia fecha y lugar.
- **P0:** la URL pública se genera sola a partir de los nombres (`ceziel-gianfranco`) y se puede editar.

#### Paso 2 — Archivos
Aquí se sube **todo el material entregable**. Es la fuente para la presentación, la ficha pública y
las descargas de la pareja.

- **P0:** una zona de subida **por cobertura** (pestañas Boda / Preboda / Pedida, solo las contratadas).
- **P0: cada carpeta subida se convierte en un momento** con el nombre de la carpeta, que luego se
  puede renombrar y reordenar. Si se suben archivos sueltos, caen en un momento "General".
- **P0:** se puede arrastrar **carpetas completas**, archivos sueltos o un **.zip**. El .zip se
  descomprime **en el navegador** y cada carpeta interna se vuelve un momento. Se descomprime en el
  navegador porque hacerlo en el servidor costaría cómputo y choca con los límites de Workers. Formatos en la §10.
- **P0:** dentro de cada momento, las fotos se ordenan por fecha de captura (EXIF) y se pueden
  reordenar a mano. Se puede mover un archivo de un momento a otro y eliminarlo.
- **P0:** progreso de subida por archivo y por carpeta, con reintento si un archivo falla.
- **P0:** botones **Guardar borrador** y **Publicar archivos**. Al publicar, quedan disponibles para
  descarga en el portal. Muestra cuántos archivos tienen cambios sin publicar.
- **P1:** total de GB por cobertura y aviso de archivos duplicados (mismo nombre y tamaño).

**Criterios de aceptación**
- [ ] Subir una carpeta "03 Ceremonia" con 120 fotos crea el momento "Ceremonia" con 120 archivos, en orden de captura.
- [ ] Un formato no permitido (ej. `.cr3`) se rechaza con un mensaje claro, sin frenar el resto de la subida.
- [ ] La pareja no ve en "Descargas" ningún archivo que no se haya publicado.

#### Paso 3 — Presentación (lo que ve la pareja en su portal)
Arma la experiencia privada. Todo se **elige entre los archivos del paso 2** o se sube en el momento.

- **P0: Banner.** Una foto o un video (bucle sin sonido de 20 s como máximo). Se elige de los archivos o se sube.
- **P0: Canción (opcional).** **Recomendado: subir un MP3 o M4A** (15 MB como máximo).
  - *Por qué no YouTube:* las reglas de la API de YouTube no permiten ocultar el reproductor para
    usarlo solo como audio, y los temas con copyright suelen tener bloqueado el embed (ya pasó con el
    film de Ceziel & Gianfranco). *Spotify* solo reproduce 30 segundos a quien no tiene sesión iniciada.
  - Con un archivo propio hay control total: entra con fundido, se puede pausar y suena en toda la presentación.
  - **P2:** enlace de YouTube como alternativa.
- **P0: Mensaje de brosbefore (opcional).** Texto libre con firma (ej. "— Carozzi & Zelmar"). Si queda vacío, la sección no aparece.
- **P0: Contenido por cobertura** (una pestaña por cobertura con archivos):
  - **Video principal** (uno por cobertura; formatos en la §10).
  - **Videos secundarios** (opcionales, ordenables).
  - **Fotos destacadas**, agrupadas por **momento** y en el orden de los momentos. El equipo marca
    cuáles destacar; las demás quedan solo en "Descargas".
- **P0:** botones **Guardar borrador**, **Vista previa** y **Publicar presentación**.
- **P1:** pantalla de entrada **"Abrir nuestra historia"**, con los nombres y la fecha. El toque de
  la pareja inicia la música, ya que los navegadores, en especial iOS, bloquean el audio hasta que
  el usuario interactúa con la página.

#### Paso 4 — Galería pública (lo que se ve en la web)
Arriba, el interruptor **"Visible en galería"** (§6). Si está apagado, el resto del paso queda bloqueado.

- **P0: Portada.** Foto **vertical (4:5)**. Se usa en el carrusel de la home y en la grilla de `/galeria`.
- **P1: Portada animada (opcional).** **MP4 o WebM de 15 s como máximo**, vertical y sin sonido, que
  se repite en bucle. Se acepta GIF de hasta 8 MB, pero se recomienda video porque un GIF de 15 s pesa
  10 veces más. **En la home** se reproduce cuando la tarjeta lleva **2 s como principal** (centrada
  en el carrusel). **En la galería** se reproduce **al hacer hover**; en móvil, donde no hay hover,
  cuando la tarjeta está centrada en pantalla. Sin portada animada, se muestra la portada fija.
- **P0: Banner.** Foto o video horizontal para la cabecera de la ficha pública.
- **P0: Título** (por defecto, los nombres del paso 1) y **Descripción** (la historia de la pareja).
- **P0: Etiquetas libres.** Al escribir, sugiere las ya existentes; si no existe, se crea con Enter.
  Son aparte de la etiqueta del plan.
- **P0: Coberturas en la web.** Solo se pueden encender las que tienen archivos. Debajo de cada
  cobertura encendida aparecen sus fotos y videos; se marcan los que se muestran en la ficha pública
  (una selección, no todo).
- **P0: Sección Portafolio** (solo disponible si está visible en galería):
  - Interruptor **"Publicar en portafolio"**. Apagado → bloqueado. Encendido → se habilita el resto.
  - Por cada cobertura: encender o apagar su aparición en la home (ej. solo Boda).
  - Por cada cobertura encendida: elegir el **video** y una **selección reducida de fotos** para el
    detalle de la home. Recomendado: entre 6 y 12, que es lo que hoy funciona bien en el carrusel.
- **P0:** **Vista previa** de la ficha pública y del detalle en la home.

**Criterios de aceptación**
- [ ] Si "Visible en galería" está apagado, los controles del paso quedan deshabilitados y la ficha pública da 404.
- [ ] Una cobertura sin archivos aparece deshabilitada, con el texto "Sube archivos en el paso 2".
- [ ] Si se apagan Preboda y Pedida en el portafolio, la home solo muestra fotos de la Boda.

#### Paso 5 — Agradecimientos
- **P0:** lista de los agradecimientos escritos por la pareja desde el portal, con autor, fecha y texto original.
- **P0: Repostear.** Abre un cuadro con el texto **precargado** para corregir la redacción o resumir,
  con el original siempre visible al lado. Al confirmar, la versión editada se publica directamente
  (sin aprobación de la pareja) en la ficha pública, **firmada por la pareja**.
- **P0:** quitar el repost en cualquier momento.

#### Paso 6 — Acceso y configuración
- **P0: Correos de la pareja.** Uno, dos o más campos de correo (botón "+ Agregar correo"). Cada campo
  tiene su ícono de **guardar** y su **estado**: *sin invitar · invitación enviada · cuenta activa · invitación vencida*.
- **P0: Enviar invitaciones.** Botón al final que envía la invitación a los correos guardados que aún
  no la recibieron. Si la presentación nunca se publicó, advierte antes de enviar.
  - **En el mock no se envía correo:** se muestra el enlace de invitación para abrirlo y simular el registro.
- **P0:** reenviar una invitación vencida y **revocar el acceso** de un correo.
- **P0:** interruptor **"Visible en galería"** (el mismo de §6).
- **P0:** interruptor **"Suspender portal"**. La pareja ve "Presentación suspendida".
- **P0: Eliminar pareja.** Borra la historia, sus cuentas y **todos sus archivos del almacenamiento**.
  Exige escribir el nombre de la pareja para confirmar y recomienda descargar un respaldo antes.
  - **P1:** papelera de 30 días antes del borrado definitivo, porque son fotos irremplazables.

### 7.6 Planes (P1)
Editar los planes (nombre, descripción, precio "desde", qué incluye). De aquí salen la página
`/planes` y las etiquetas de plan de cada pareja. Hasta que exista, los planes son fijos.

---

## 8. Web pública

### 8.1 Rutas
| Ruta | Página |
|---|---|
| `/` | Home con el carrusel del portafolio (sin cambios visuales) |
| `/galeria` | Todas las historias publicadas |
| `/galeria/{pareja}` | Ficha pública de la pareja |
| `/nosotros` | Nosotros |
| `/planes` | Planes (antes Pricing). `/pricing` redirige aquí |
| `/portal` | Portal de clientes (ver §9) |

### 8.2 Navbar
- **Home:** el navbar actual **no se toca** (logo, sonido, tema y hamburguesa). Solo se agrega un botón **"Portal"**.
- **Resto de las páginas** (Galería, ficha, Nosotros y Planes): navbar nuevo con los enlaces
  **Nosotros · Galería · Planes** y el botón **"Portal"** destacado. En móvil se colapsa en la hamburguesa.
- **Menú hamburguesa:** Inicio, Nosotros, **Galería**, **Planes**, Contáctanos, Instagram y Portal.

### 8.3 Home
- **P0:** botón **"Ver galería"** visible sobre el carrusel; lleva a `/galeria`.
- **P0:** al final del detalle de cada pareja, botón **"Ver historia completa"**, que lleva a
  `/galeria/{pareja}`. Se mantiene "Siguiente historia".
- **P0:** el contenido del carrusel sale de los datos del admin (§7.4 y paso 4), no de `data.js`.

### 8.4 Galería (`/galeria`)
- **P0:** grilla de tarjetas **verticales** con la portada, los nombres y las coberturas; la portada animada se reproduce según el paso 4.
- **P0:** filtro por cobertura: **Todas · Boda · Preboda · Pedida**.
- **P1:** filtro por etiqueta.

### 8.5 Ficha pública (`/galeria/{pareja}`)
- **P0:** banner, nombres, plan, etiquetas, descripción y **selector de cobertura** (pestañas, solo
  las encendidas). Por cada cobertura: su video y la selección de fotos, agrupadas por momento.
- **P0:** si tiene un agradecimiento reposteado, se muestra como cita firmada por la pareja.
- **P0:** al final, botones a **Planes** y **Contáctanos**, y "Siguiente historia".

### 8.6 Nosotros y Planes
- **P0:** al final de Nosotros, botones **Galería** y **Planes**.
- **P0:** al final de Planes, botones **Conócenos** (lleva a Nosotros) y **Galería**.

---

## 9. Portal de clientes

**Acceso solo por invitación.** No existe registro abierto.

- **P0: Login** (`/portal/login`): correo y contraseña, con el aviso *"El acceso es solo por invitación de brosbefore"* y **"Olvidé mi contraseña"**.
- **P0: Registro desde la invitación:** el enlace abre un formulario con el **correo ya cargado (no
  editable)**, **nombre** y **contraseña**. Un enlace vencido o revocado muestra un mensaje y la opción
  de pedir otro a brosbefore.
- **P0:** una vez dentro, solo hay **3 secciones** y **Cerrar sesión**:
  1. **Presentación:** la versión publicada del paso 3 (banner, música, mensaje y, por cobertura,
     el video principal, los secundarios y las fotos destacadas por momento).
  2. **Archivos:** descarga **por archivo**, **por momento (carpeta)**, **por cobertura** o **todo**.
     Solo se descargan **fotos y videos** (el trabajo entregado); la canción y el mensaje quedan
     fuera. Las descargas múltiples se arman como .zip **en el navegador**, sin costo de servidor.
     Se muestran el tamaño y la cantidad de archivos antes de descargar.
  3. **Agradecimiento:** cada miembro con acceso escribe y firma el suyo (uno por persona, que puede
     editar mientras no haya sido reposteado). También ve los de su pareja.
- **P0: Compartir.** Botón que copia o comparte (menú nativo en móvil) el enlace de la **ficha
  pública** de la pareja en la web. Si la pareja no está visible en galería, el botón no aparece,
  porque ese enlace daría 404. El portal privado nunca se comparte.
- **P0:** con el portal suspendido, se muestra una pantalla "Presentación suspendida" con un contacto.
- **P0:** cada cuenta ve **solo** su historia, y una persona tiene acceso a una sola historia.
  Es el requisito de seguridad más importante.

---

## 10. Especificaciones de archivos

| Uso | Formatos | Recomendado | Límite |
|---|---|---|---|
| Fotos entregables | JPG, PNG, WebP | JPG en alta resolución, sRGB | 50 MB por foto |
| Video principal y secundarios (para **ver**) | **MP4 (H.264 + AAC)** | 1080p o 4K | 20 GB por archivo |
| Videos para **descargar** (máster) | MP4, MOV | El máster que se entrega | 20 GB por archivo |
| Banner en video | MP4 o WebM, sin sonido | 1080p horizontal | 20 s · 30 MB |
| Portada animada | MP4 o WebM (GIF permitido) | 1080×1350 vertical, sin sonido | 15 s · 15 MB (GIF: 8 MB) |
| Canción | MP3, M4A | 192–320 kbps | 15 MB |
| Carga masiva | Carpetas o .zip | Una carpeta por momento | — |

- **No se aceptan RAW** (CR3, NEF, ARW…): se entrega solo el material editado.
- **H.265/HEVC y MOV** se aceptan para descarga, pero **no para reproducir en la web**, porque no
  todos los navegadores los reproducen. Para verlos se pide una versión MP4 H.264.
- **P2:** fotos HEIC de iPhone, convertidas automáticamente.
- En la versión real, cada foto se guarda en 3 tamaños (miniatura, vista web y original), generados
  en el navegador del admin al subirla (ver PLAN-PRODUCCION).

---

## 11. Historias de usuario (las principales)

**Equipo brosbefore (admin)**
- Como editor, quiero subir las carpetas de una boda tal como las tengo en mi computadora para que los momentos se armen solos.
- Como editor, quiero elegir el banner, la canción y las fotos destacadas entre lo que ya subí para armar la presentación sin volver a subir nada.
- Como editor, quiero ver la presentación exactamente como la verá la pareja antes de invitarla para no entregar algo incompleto.
- Como socio, quiero decidir qué historias y qué coberturas aparecen en la home para mostrar siempre el mejor trabajo.
- Como socio, quiero mejorar la redacción de un testimonio antes de publicarlo para que se lea bien en la web.
- Como socio, quiero ver cuánto almacenamiento usamos para controlar el costo.

**Pareja (portal)**
- Como novia, quiero entrar con el enlace que me llegó y crear mi contraseña para ver nuestra historia.
- Como pareja, quiero descargar solo la carpeta de la ceremonia, o todo de una vez, para guardarlo como prefiramos.
- Como novio, quiero dejar mi propio agradecimiento, aparte del de mi pareja, para contar lo que viví.
- Como pareja con el portal suspendido, quiero entender qué pasó y a quién escribir.

**Visitante (web pública)**
- Como pareja que busca fotógrafo, quiero filtrar la galería por pedida, preboda o boda para ver trabajos como el que quiero.
- Como visitante, quiero pasar de la home a la historia completa de una pareja para ver más que la selección del carrusel.

---

## 12. El mock y la preparación para migrar

### Qué se simula en el mock
| Real (sandbox/main) | En el mock |
|---|---|
| Base de datos Supabase | Datos de ejemplo + `localStorage` (persisten en el navegador), con un botón **"Restablecer demo"** |
| Archivos en R2 | Archivos guardados en el navegador (IndexedDB) y fotos de ejemplo |
| Login e invitaciones (Supabase Auth + Resend) | Usuarios de demo; la invitación muestra el enlace en vez de enviar un correo |
| Admin protegido (Cloudflare Access) | Entrada directa con un usuario de demo |
| Métricas reales | Números ficticios |

**Datos iniciales del mock:** las 6 parejas de hoy (`js/data.js`) se cargan en el admin como
historias con cobertura Boda, sus fotos como archivos y el orden actual como orden del portafolio.
Para mostrar las tres coberturas, a una o dos parejas se les agregan una Preboda o una Pedida de ejemplo.

### Reglas para que migrar sea fácil
1. **Toda lectura y escritura pasa por una sola capa de datos** (`repo`), con las mismas funciones
   que tendrá Supabase (`listCouples`, `saveCouple`, `uploadFiles`, `publishPresentation`…). Migrar
   es cambiar `MockRepo` por `SupabaseRepo`.
2. **El almacenamiento también pasa por una capa propia** (`storage`): `MockStorage` (navegador) → `R2Storage` (URLs firmadas).
3. **El modelo de datos del mock es el mismo de la §13**, con los mismos nombres de tablas y campos.
4. **Las rutas del mock son las rutas finales** (`/galeria/{pareja}`, `/portal`…). El admin vive en
   `/admin` y en producción pasa a `admin.brosbefore.com`.

### Tecnología del mock
- **Next.js desde el inicio**, en el **monorepo** que define el plan: `apps/web` (web pública +
  portal), `apps/admin` y `packages/` (tipos, `repo`, `storage` y datos de ejemplo compartidos).
  Así el mock es la base de la versión real y no se tira nada.
- **Se publica en GitHub Pages** hasta tener las credenciales de Cloudflare Workers. Las dos apps
  se exportan como sitio estático (`output: "export"`).
- **GitHub Pages publica un solo sitio por repo:** el sitio actual (desde `main`) sigue en la raíz, y
  el mock se publica en una subruta (ej. `/brosbefore-web/demo/` y `/brosbefore-web/demo/admin/`)
  con un workflow de GitHub Actions. Para eso, en *Settings → Pages*, la fuente pasa de "rama `main`"
  a "GitHub Actions" (un cambio único que hace el dueño del repo).
- **Limitación de un sitio estático:** las fichas de las parejas de ejemplo se generan de antemano;
  las que se creen en el admin durante una demo (guardadas en el navegador) se abren con una ruta de
  respaldo que lee los datos del navegador. En Workers esa limitación desaparece.

## 13. Modelo de datos (borrador)

```
couples          id, slug, names, plan_id, location, wedding_date, in_gallery, in_portfolio,
                 portfolio_order, portal_status(active|suspended), created_at, deleted_at
coverages        id, couple_id, type(boda|preboda|pedida), date, location,
                 show_in_gallery, show_in_portfolio
moments          id, coverage_id, name, order
files            id, moment_id, kind(photo|video), storage_key, variants{thumb,web,original},
                 width, height, duration, size, taken_at, order, published
presentations    couple_id, banner_file_id, song_key, message, message_signature,
                 draft{...}, published{...}, published_at
pres_items       id, coverage_id, file_id, role(main_video|secondary_video|featured_photo), order
public_profiles  couple_id, cover_file_id, cover_motion_key, banner_file_id, title, description
public_items     id, coverage_id, file_id, scope(gallery|portfolio), order
tags             id, name           ·  couple_tags  couple_id, tag_id
plans            id, name, description, price_from, includes[]
members          id, couple_id, email, name, user_id, status(saved|invited|active|expired|revoked),
                 invited_at
testimonials     id, couple_id, member_id, original_text, published_text, reposted, updated_at
```

Regla de seguridad para la versión real: un `member` con cuenta activa solo puede leer los datos
de **su** `couple_id`, y solo puede escribir su propio testimonio (RLS en Supabase).

## 14. Métricas de éxito (cuando esté en producción)

| Indicador | Meta |
|---|---|
| Tiempo para crear una historia completa (sin contar la subida) | < 30 min |
| Parejas que aceptan la invitación dentro de 7 días | ≥ 80 % |
| Parejas que descargan sus archivos | ≥ 90 % |
| Parejas que dejan un agradecimiento | ≥ 50 % |
| Consultas que llegan después de visitar la galería | Medir la base y luego mejorarla |

## 15. Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 2026-10-04 | El mock se construye en **Next.js** desde el inicio (monorepo del plan). |
| 2026-10-04 | El mock se publica en **GitHub Pages**; pasa a **Cloudflare Workers** cuando haya credenciales. |
| 2026-10-04 | Portada animada: en la **home**, a los **2 s** de quedar como principal; en la **galería**, **al hacer hover**. |
| 2026-10-04 | Los testimonios se **editan y publican sin aprobación** de la pareja; afuera se muestran firmados por la pareja. |
| 2026-10-04 | Se acepta música con copyright en la presentación privada del portal. |
| 2026-10-04 | **Nosotros y Planes** usan el navbar nuevo con enlaces, igual que la Galería. |
| 2026-10-04 | Una persona tiene acceso a **una sola historia**. El portal tiene un botón **Compartir** que envía el enlace de la ficha pública. |
| 2026-10-04 | "Descargar todo" incluye **solo fotos y videos** (el trabajo entregado). |

## 16. Preguntas pendientes

Para conversar con el equipo. Aquí se juntan las que vayan saliendo.

| # | Pregunta | Para |
|---|---|---|
| 1 | ¿El portal y las descargas vencen después de un tiempo? (ej. 12 meses, como en el plan de costos) | Equipo |
