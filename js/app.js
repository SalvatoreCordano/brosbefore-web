// Carrusel 3D (cover-flow diagonal) + vista de detalle con la galería en columna a la izquierda.
(function () {
  const works = window.WORKS;
  const N = works.length;
  const stage = document.getElementById("stage");
  const detailEl = document.getElementById("detail");
  const detailInner = document.getElementById("detailInner");
  const hudTitle = document.getElementById("hudTitle");
  const hudMeta = document.getElementById("hudMeta");
  const hudCount = document.getElementById("hudCount");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- estado ----------
  let pos = 0; // posición animada (float)
  let target = 0; // posición objetivo
  let mode = 0; // 0 = home, 1 = detalle (animado)
  let modeTarget = 0;
  let selected = -1; // cobertura mostrada en el panel
  let running = false;
  let L = {}; // layout calculado

  const pad = (n) => String(n).padStart(2, "0");
  const wrap = (i) => ((i % N) + N) % N;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- cards ----------
  const cards = works.map((w, i) => {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.index = i;
    el.innerHTML = `<img src="${w.cover}" alt="${w.couple} — ${w.place}" draggable="false" ${i > 3 && i < N - 3 ? 'loading="lazy"' : ""}/>`;
    stage.appendChild(el);
    return el;
  });

  // ---------- layout ----------
  function layout() {
    const vw = innerWidth;
    const vh = innerHeight;
    const mobile = vw < 768;
    let H = vh * 0.6;
    let W = H * 0.816;
    if (W > vw * 0.62) {
      W = vw * 0.62;
      H = W / 0.816;
    }
    const stepX = Math.max(vw * 0.19, W * 0.6);
    const stepY = Math.max(vh * 0.165, H * 0.28);

    // detalle
    let det;
    if (mobile) {
      const stripH = vh * 0.34;
      const s = (stripH * 0.72) / H;
      det = { mobile, s, cx: 0, cy: -vh / 2 + stripH / 2 + 26, step: W * s * 0.9 };
    } else {
      const colW = vw * 0.38;
      const s = Math.min((vh * 0.5) / H, (colW * 0.62) / W);
      det = { mobile, s, cx: -vw / 2 + colW / 2, cy: 0, step: H * s * 0.84 };
    }
    L = { vw, vh, W, H, stepX, stepY, det };
    detailScroll = mobile ? detailEl.scrollTop : 0;
    cards.forEach((c) => {
      c.style.width = W + "px";
      c.style.height = H + "px";
      c.style.marginLeft = -W / 2 + "px";
      c.style.marginTop = -H / 2 + "px";
    });
    kick();
  }

  // transform de una card a distancia d del centro
  function homeT(d) {
    const a = Math.abs(d);
    const s = Math.sign(d);
    const a1 = Math.min(a, 1);
    return {
      x: s * L.stepX * (a <= 1 ? a : 1 + (a - 1) * 0.12),
      y: d * L.stepY,
      z: a <= 1 ? -a * 125 : -125 - (a - 1) * 275,
      rx: 0,
      ry: -s * 33 * a1,
      sc: Math.max(0.5, 1.2 - 0.155 * a),
      blur: a * 2,
      op: clamp(1 - 0.2 * a, 0, 1),
    };
  }
  function detailT(d) {
    const a = Math.abs(d);
    const s = Math.sign(d);
    const a1 = Math.min(a, 1);
    const D = L.det;
    const shrink = 1 - 0.18 * a1 - 0.06 * Math.max(0, a - 1);
    const dist = a <= 1 ? a : 1 + (a - 1) * 0.72;
    if (D.mobile) {
      return {
        x: D.cx + s * D.step * dist, y: D.cy - detailScroll, z: 0, // la tira sube con el scroll
        rx: 0, ry: 0,
        sc: D.s * shrink, blur: a * 1.5, op: clamp(1 - 0.28 * a, 0, 1),
      };
    }
    // sin rotación ni profundidad: la columna está fuera del punto de fuga y se deformaría
    return {
      x: D.cx, y: D.cy + s * D.step * dist, z: 0,
      rx: 0, ry: 0,
      sc: D.s * shrink, blur: a * 1.6, op: clamp(1 - 0.28 * a, 0, 1),
    };
  }

  function render() {
    const m = easeInOut(mode);
    cards.forEach((el, i) => {
      let d = i - pos;
      d = d - N * Math.round(d / N); // loop infinito
      const a = Math.abs(d);
      if (a > 3.2) {
        el.style.visibility = "hidden";
        return;
      }
      el.style.visibility = "visible";
      const h = homeT(d);
      const t = m > 0 ? detailT(d) : h;
      const k = {};
      for (const key in h) k[key] = lerp(h[key], t[key], m);
      el.style.transform = `translate3d(${k.x}px, ${k.y}px, ${k.z}px) rotateX(${k.rx}deg) rotateY(${k.ry}deg) scale(${k.sc})`;
      el.style.filter = k.blur > 0.05 ? `blur(${k.blur}px)` : "none";
      el.style.opacity = k.op;
      el.style.zIndex = 1000 - Math.round(a * 10);
    });
  }
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // animación basada en tiempo (igual a 60Hz, 120Hz o con frames perdidos)
  const MODE_MS = 700;
  let lastT = 0;
  function tick(now) {
    const dt = Math.min(100, now - lastT || 16.7);
    lastT = now;
    const f = reduceMotion ? 1 : 1 - Math.pow(1 - 0.085, dt / 16.7);
    pos = lerp(pos, target, f);
    if (Math.abs(target - pos) < 0.0005) pos = target;
    const mf = reduceMotion ? 1 : dt / MODE_MS;
    mode = modeTarget > mode ? Math.min(modeTarget, mode + mf) : Math.max(modeTarget, mode - mf);
    render();
    if (pos !== target || mode !== modeTarget || dragging) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
  function kick() {
    if (!running) {
      running = true;
      lastT = performance.now();
      requestAnimationFrame(tick);
    }
  }

  // ---------- índice activo / HUD ----------
  // mobile: la tira de fotos acompaña el scroll del panel de detalle
  let detailScroll = 0;
  detailEl.addEventListener(
    "scroll",
    () => {
      detailScroll = L.det.mobile ? detailEl.scrollTop : 0;
      render();
    },
    { passive: true }
  );

  let lastActive = -1;
  function activeIndex() {
    return wrap(Math.round(target));
  }
  function onTargetChange() {
    const i = activeIndex();
    if (i === lastActive) return;
    if (lastActive !== -1 && window.ProjectorSound) ProjectorSound.play();
    lastActive = i;
    const w = works[i];
    hudTitle.textContent = w.couple;
    hudMeta.textContent = `${w.place} — ${w.collection}`;
    hudCount.textContent = `${pad(i + 1)} / ${pad(N)}`;
    if (modeTarget === 1) scheduleSelect(i);
  }
  function goTo(t) {
    target = t;
    onTargetChange();
    kick();
  }
  // mover al índice i por el camino más corto
  function goToIndex(i) {
    const cur = Math.round(target);
    let delta = i - wrap(cur);
    delta = delta - N * Math.round(delta / N);
    goTo(cur + delta);
  }

  // ---------- input: wheel ----------
  // Cada gesto de rueda avanza al menos una card; el trackpad puede avanzar varias.
  let snapTimer;
  let wheelStart = null;
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (wheelStart === null) wheelStart = Math.round(target);
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1;
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
      target += clamp(delta, -120, 120) * 0.0032;
      onTargetChange();
      kick();
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const moved = target - wheelStart;
        const n = Math.abs(moved) < 0.04 ? 0 : Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
        goTo(wheelStart + n);
        wheelStart = null;
      }, 140);
    },
    { passive: false }
  );

  // ---------- input: drag / click ----------
  let dragging = false;
  let start = null;
  let moved = 0;
  let lastMove = null;
  let velocity = 0;

  function dragAxis() {
    // devuelve cuánto "pos" avanza por píxel arrastrado (dx, dy)
    if (modeTarget === 1) {
      return L.det.mobile ? [1 / (L.det.step), 0] : [0, 1 / L.det.step];
    }
    const len2 = L.stepX * L.stepX + L.stepY * L.stepY;
    return [L.stepX / len2, L.stepY / len2];
  }

  function startDrag(e, el) {
    if (e.button !== 0) return;
    dragging = true;
    moved = 0;
    velocity = 0;
    start = { x: e.clientX, y: e.clientY, target };
    lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
    el.setPointerCapture(e.pointerId);
    kick();
  }
  stage.addEventListener("pointerdown", (e) => startDrag(e, stage));
  // mobile: el panel de detalle tiene que recibir toques para que iOS lo deje scrollear,
  // así que la zona transparente de arriba (la tira de fotos) reenvía el swipe horizontal
  // al carrusel. El scroll vertical lo maneja el navegador (touch-action: pan-y).
  detailEl.addEventListener("pointerdown", (e) => {
    if (e.target === detailEl && L.det.mobile) startDrag(e, detailEl);
  });
  function onDragMove(e) {
    if (!dragging) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    moved = Math.max(moved, Math.hypot(dx, dy));
    if (moved > 6) stage.classList.add("is-dragging");
    const [ax, ay] = dragAxis();
    target = start.target - (dx * ax + dy * ay) * 1.2;
    const now = performance.now();
    const dt = Math.max(1, now - lastMove.t);
    const step = -((e.clientX - lastMove.x) * ax + (e.clientY - lastMove.y) * ay) * 1.2;
    velocity = lerp(velocity, step / dt, 0.4);
    lastMove = { x: e.clientX, y: e.clientY, t: now };
    onTargetChange();
  }
  stage.addEventListener("pointermove", onDragMove);
  detailEl.addEventListener("pointermove", onDragMove);
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (moved <= 6 && e.type === "pointerup") {
      handleClick(e);
      return;
    }
    goTo(Math.round(target + clamp(velocity * 180, -2, 2)));
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  detailEl.addEventListener("pointerup", endDrag);
  detailEl.addEventListener("pointercancel", endDrag);

  function handleClick(e) {
    const hit = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.classList && n.classList.contains("card"));
    if (!hit) {
      goTo(Math.round(target));
      return;
    }
    const i = Number(hit.dataset.index);
    if (i === activeIndex() && modeTarget === 0) {
      open(i);
    } else {
      goToIndex(i);
      if (modeTarget === 1) select(i); // click en detalle = cambio inmediato
    }
  }

  // ---------- teclado ----------
  addEventListener("keydown", (e) => {
    if (document.body.classList.contains("menu-open")) return;
    if (["ArrowRight", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      goTo(Math.round(target) + 1);
    } else if (["ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      goTo(Math.round(target) - 1);
    } else if (e.key === "Enter" && modeTarget === 0) {
      open(activeIndex());
    } else if (e.key === "Escape" && modeTarget === 1) {
      close();
    }
  });

  // ---------- detalle ----------
  // reserva el alto de la foto antes de que cargue (si la URL trae /ancho/alto, como los mocks)
  function sizeAttrs(src) {
    const m = src.match(/\/(\d+)\/(\d+)(?:\?|$)/);
    return m ? `width="${m[1]}" height="${m[2]}"` : "";
  }

  function detailHTML(w, i) {
    const next = works[wrap(i + 1)];
    return `
      <div class="detail__top">
        <span class="eyebrow">${pad(i + 1)} — ${w.collection}</span>
        <button class="detail__close" data-close>
          Cerrar
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>
        </button>
      </div>
      <h1 class="detail__title">${w.couple}</h1>
      <div class="detail__meta"><span>${w.place}</span><span>${w.date}</span></div>
      <div class="detail__tags">${w.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
      <p class="detail__story">${w.story}</p>

      <div class="detail__label eyebrow"><span>Film</span><span>${w.collection}</span></div>
      <div class="video" data-video>
        <img src="${w.photos[0]}" alt="" loading="lazy" />
        <button class="video__play" aria-label="Reproducir film de ${w.couple}">
          <span><svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true"><path d="M2 1.5v19L19 11z" fill="#1b1916"/></svg></span>
        </button>
        <span class="video__note">Video próximamente</span>
      </div>

      <div class="detail__label eyebrow"><span>Fotografía</span><span>${w.photos.length} fotos</span></div>
      <div class="photos">
        ${w.photos.map((p, n) => `<img src="${p}" alt="${w.couple} — foto ${n + 1}" loading="lazy" ${sizeAttrs(p)} />`).join("")}
      </div>

      <button class="detail__next" data-next="${wrap(i + 1)}">
        <span><span class="eyebrow">Siguiente historia</span><strong>${next.couple}</strong></span>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 14h20M16 6l8 8-8 8"/></svg>
      </button>
    `;
  }

  let swapTimer;
  function select(i, instant) {
    if (i === selected) return;
    selected = i;
    clearTimeout(swapTimer);
    const w = works[i];
    const paint = () => {
      detailInner.innerHTML = detailHTML(w, i);
      detailEl.scrollTop = 0;
      detailInner.classList.remove("is-swapping");
    };
    history.replaceState(null, "", "#/" + w.id);
    document.title = `${w.couple} — (brosbefore)™`;
    if (instant) return paint();
    detailInner.classList.add("is-swapping");
    swapTimer = setTimeout(paint, 280);
  }
  let selectTimer;
  function scheduleSelect(i) {
    clearTimeout(selectTimer);
    selectTimer = setTimeout(() => select(i), 220);
  }

  function open(i) {
    goToIndex(i);
    selected = -1;
    select(i, true);
    modeTarget = 1;
    document.body.classList.add("is-detail");
    detailEl.setAttribute("aria-hidden", "false");
    kick();
  }
  function close() {
    modeTarget = 0;
    selected = -1;
    document.body.classList.remove("is-detail");
    detailEl.setAttribute("aria-hidden", "true");
    detailEl.scrollTop = 0; // devuelve el navbar a transparente
    history.replaceState(null, "", location.pathname);
    document.title = "(brosbefore)™ — Fotografía y film de bodas";
    kick();
  }

  detailEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) return close();
    const nextBtn = e.target.closest("[data-next]");
    if (nextBtn) {
      const i = Number(nextBtn.dataset.next);
      goToIndex(i);
      select(i);
      return;
    }
    const play = e.target.closest(".video__play");
    if (play) {
      const box = play.closest("[data-video]");
      const src = works[selected].video;
      if (!src) {
        box.classList.add("is-mock-clicked");
        return;
      }
      box.innerHTML = /\.mp4($|\?)/.test(src)
        ? `<video src="${src}" controls autoplay playsinline></video>`
        : `<iframe src="${src}${src.includes("?") ? "&" : "?"}autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
  });

  // ---------- sonido ----------
  const soundBtn = document.getElementById("soundToggle");
  document.querySelector(".nav__actions")?.prepend(soundBtn); // junto al tema y la hamburguesa
  const syncSound = () => {
    const on = ProjectorSound.enabled;
    soundBtn.classList.toggle("is-off", !on);
    soundBtn.setAttribute("aria-pressed", String(on));
    soundBtn.querySelector(".sound__label").textContent = on ? "Sonido" : "Sin sonido";
  };
  soundBtn.addEventListener("click", () => {
    ProjectorSound.setEnabled(!ProjectorSound.enabled);
    syncSound();
    if (ProjectorSound.enabled) setTimeout(() => ProjectorSound.play(), 30); // muestra del clack
  });
  syncSound();

  // ---------- init ----------
  addEventListener("resize", layout);
  layout();
  const fromHash = works.findIndex((w) => "#/" + w.id === location.hash);
  if (fromHash >= 0) {
    pos = target = fromHash;
    onTargetChange();
    open(fromHash);
    mode = 1;
  } else {
    onTargetChange();
  }
  render();
})();
