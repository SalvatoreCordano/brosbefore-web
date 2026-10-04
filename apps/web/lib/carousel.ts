// Carrusel 3D (cover-flow diagonal) + vista de detalle con la galería en columna a la izquierda.
// Port directo de js/app.js del sitio estático: misma matemática e interacciones.
// mountCarousel() arma todo sobre los elementos dados y devuelve una función que lo desmonta.
import type { PortfolioItem, PortfolioPhoto } from "@bb/core";
import { projectorSound } from "./projector-sound";

export interface CarouselEls {
  stage: HTMLElement;
  detail: HTMLElement;
  detailInner: HTMLElement;
  hudTitle: HTMLElement;
  hudMeta: HTMLElement;
  hudCount: HTMLElement;
}

interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  sc: number;
  blur: number;
  op: number;
}

// el contenido llega del admin: todo texto se escapa antes de entrar a innerHTML
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function mountCarousel(els: CarouselEls, works: PortfolioItem[], navigate: (href: string) => void): () => void {
  const { stage, detail: detailEl, detailInner, hudTitle, hudMeta, hudCount } = els;
  const N = works.length;
  const ac = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window | Document,
    type: K | string,
    fn: (e: never) => void,
    opts: AddEventListenerOptions = {}
  ) => target.addEventListener(type, fn as EventListener, { ...opts, signal: ac.signal });
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
    return t;
  };
  if (!N) return () => {};

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sound = projectorSound();

  // ---------- estado ----------
  let pos = 0; // posición animada (float)
  let target = 0; // posición objetivo
  let mode = 0; // 0 = home, 1 = detalle (animado)
  let modeTarget = 0;
  let selected = -1; // cobertura mostrada en el panel
  let running = false;
  let rafId = 0;
  let L: {
    vw: number;
    vh: number;
    W: number;
    H: number;
    stepX: number;
    stepY: number;
    det: { mobile: boolean; s: number; cx: number; cy: number; step: number };
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const wrap = (i: number) => ((i % N) + N) % N;
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // ---------- cards ----------
  stage.replaceChildren();
  const cards = works.map((w, i) => {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.index = String(i);
    const img = document.createElement("img");
    img.src = w.cover;
    img.alt = `${w.couple} — ${w.place}`;
    img.draggable = false;
    // coverPos: encuadre de la portada dentro de la card vertical (útil si la foto es horizontal)
    if (w.coverPos) img.style.objectPosition = w.coverPos;
    if (i > 3 && i < N - 3) img.loading = "lazy";
    el.appendChild(img);
    stage.appendChild(el);
    return el;
  });

  // ---------- layout ----------
  let detailScroll = 0;
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
  function homeT(d: number): Pose {
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
  function detailT(d: number): Pose {
    const a = Math.abs(d);
    const s = Math.sign(d);
    const a1 = Math.min(a, 1);
    const D = L.det;
    const shrink = 1 - 0.18 * a1 - 0.06 * Math.max(0, a - 1);
    const dist = a <= 1 ? a : 1 + (a - 1) * 0.72;
    if (D.mobile) {
      return {
        x: D.cx + s * D.step * dist,
        y: D.cy - detailScroll, // la tira sube con el scroll
        z: 0,
        rx: 0,
        ry: 0,
        sc: D.s * shrink,
        blur: a * 1.5,
        op: clamp(1 - 0.28 * a, 0, 1),
      };
    }
    // sin rotación ni profundidad: la columna está fuera del punto de fuga y se deformaría
    return {
      x: D.cx,
      y: D.cy + s * D.step * dist,
      z: 0,
      rx: 0,
      ry: 0,
      sc: D.s * shrink,
      blur: a * 1.6,
      op: clamp(1 - 0.28 * a, 0, 1),
    };
  }

  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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
      const k = {} as Pose;
      for (const key in h) k[key as keyof Pose] = lerp(h[key as keyof Pose], t[key as keyof Pose], m);
      el.style.transform = `translate3d(${k.x}px, ${k.y}px, ${k.z}px) rotateX(${k.rx}deg) rotateY(${k.ry}deg) scale(${k.sc})`;
      el.style.filter = k.blur > 0.05 ? `blur(${k.blur}px)` : "none";
      el.style.opacity = String(k.op);
      el.style.zIndex = String(1000 - Math.round(a * 10));
    });
  }

  // animación basada en tiempo (igual a 60Hz, 120Hz o con frames perdidos)
  const MODE_MS = 700;
  let lastT = 0;
  function tick(now: number) {
    const dt = Math.min(100, now - lastT || 16.7);
    lastT = now;
    const f = reduceMotion ? 1 : 1 - Math.pow(1 - 0.085, dt / 16.7);
    pos = lerp(pos, target, f);
    if (Math.abs(target - pos) < 0.0005) pos = target;
    const mf = reduceMotion ? 1 : dt / MODE_MS;
    mode = modeTarget > mode ? Math.min(modeTarget, mode + mf) : Math.max(modeTarget, mode - mf);
    render();
    if (pos !== target || mode !== modeTarget || dragging) {
      rafId = requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
  function kick() {
    if (!running) {
      running = true;
      lastT = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  // ---------- índice activo / HUD ----------
  // mobile: la tira de fotos acompaña el scroll del panel de detalle
  on(
    detailEl,
    "scroll",
    () => {
      detailScroll = L.det.mobile ? detailEl.scrollTop : 0;
      render();
    },
    { passive: true }
  );

  // portada animada: se reproduce cuando la card lleva 2 s como principal (solo en la home)
  let motionTimer: ReturnType<typeof setTimeout> | undefined;
  let motionEl: HTMLElement | null = null;
  function stopMotion() {
    if (motionTimer) clearTimeout(motionTimer);
    motionEl?.remove();
    motionEl = null;
  }
  function scheduleMotion(i: number) {
    stopMotion();
    const src = works[i].coverMotion;
    if (!src || reduceMotion) return;
    motionTimer = later(() => {
      if (activeIndex() !== i || modeTarget !== 0) return;
      const v = document.createElement("video");
      Object.assign(v, { src, muted: true, loop: true, playsInline: true, autoplay: true, className: "card__motion" });
      // si no es video (GIF), se muestra como imagen
      v.onerror = () => {
        const img = document.createElement("img");
        img.src = src;
        img.className = "card__motion";
        v.replaceWith(img);
        motionEl = img;
      };
      cards[i].appendChild(v);
      v.play().catch(() => {});
      motionEl = v;
    }, 2000);
  }

  let lastActive = -1;
  const activeIndex = () => wrap(Math.round(target));
  function onTargetChange() {
    const i = activeIndex();
    if (i === lastActive) return;
    if (lastActive !== -1) sound.play();
    lastActive = i;
    if (modeTarget === 0) scheduleMotion(i);
    const w = works[i];
    hudTitle.textContent = w.couple;
    hudMeta.textContent = `${w.place} — ${w.collection}`;
    hudCount.textContent = `${pad(i + 1)} / ${pad(N)}`;
    if (modeTarget === 1) scheduleSelect(i);
  }
  function goTo(t: number) {
    target = t;
    onTargetChange();
    kick();
  }
  // mover al índice i por el camino más corto
  function goToIndex(i: number) {
    const cur = Math.round(target);
    let delta = i - wrap(cur);
    delta = delta - N * Math.round(delta / N);
    goTo(cur + delta);
  }

  // ---------- input: wheel ----------
  // Cada gesto de rueda avanza al menos una card; el trackpad puede avanzar varias.
  let snapTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelStart: number | null = null;
  on(
    stage,
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      if (wheelStart === null) wheelStart = Math.round(target);
      const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? innerHeight : 1;
      const delta = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
      target += clamp(delta, -120, 120) * 0.0032;
      onTargetChange();
      kick();
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = later(() => {
        const moved = target - (wheelStart ?? 0);
        const n = Math.abs(moved) < 0.04 ? 0 : Math.sign(moved) * Math.max(1, Math.round(Math.abs(moved)));
        goTo((wheelStart ?? 0) + n);
        wheelStart = null;
      }, 140);
    },
    { passive: false }
  );

  // ---------- input: drag / click ----------
  let dragging = false;
  let start = { x: 0, y: 0, target: 0 };
  let moved = 0;
  let lastMove = { x: 0, y: 0, t: 0 };
  let velocity = 0;

  // cuánto avanza "pos" por píxel arrastrado (dx, dy)
  function dragAxis(): [number, number] {
    if (modeTarget === 1) {
      return L.det.mobile ? [1 / L.det.step, 0] : [0, 1 / L.det.step];
    }
    const len2 = L.stepX * L.stepX + L.stepY * L.stepY;
    return [L.stepX / len2, L.stepY / len2];
  }

  function startDrag(e: PointerEvent, el: HTMLElement) {
    if (e.button !== 0) return;
    dragging = true;
    moved = 0;
    velocity = 0;
    start = { x: e.clientX, y: e.clientY, target };
    lastMove = { x: e.clientX, y: e.clientY, t: performance.now() };
    el.setPointerCapture(e.pointerId);
    kick();
  }
  on(stage, "pointerdown", (e: PointerEvent) => startDrag(e, stage));
  // mobile: el panel de detalle tiene que recibir toques para que iOS lo deje scrollear,
  // así que la zona transparente de arriba (la tira de fotos) reenvía el swipe horizontal
  // al carrusel. El scroll vertical lo maneja el navegador (touch-action: pan-y).
  on(detailEl, "pointerdown", (e: PointerEvent) => {
    if (e.target === detailEl && L.det.mobile) startDrag(e, detailEl);
  });
  function onDragMove(e: PointerEvent) {
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
  on(stage, "pointermove", onDragMove);
  on(detailEl, "pointermove", onDragMove);
  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (moved <= 6 && e.type === "pointerup") {
      handleClick(e);
      return;
    }
    goTo(Math.round(target + clamp(velocity * 180, -2, 2)));
  }
  on(stage, "pointerup", endDrag);
  on(stage, "pointercancel", endDrag);
  on(detailEl, "pointerup", endDrag);
  on(detailEl, "pointercancel", endDrag);

  function handleClick(e: PointerEvent) {
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .find((n): n is HTMLElement => n instanceof HTMLElement && n.classList.contains("card"));
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
  on(window, "keydown", (e: KeyboardEvent) => {
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
  const sizeAttrs = (p: PortfolioPhoto) => (p.w && p.h ? `width="${p.w}" height="${p.h}"` : "");
  const photoRatio = (p: PortfolioPhoto) => (p.w && p.h ? p.h / p.w : 1.25);

  // Galería en 2 columnas que se lee en orden (1, 2 / 3, 4…): cada foto va a la columna
  // más corta. En mobile las columnas se aplanan y "order" mantiene la secuencia.
  function photoColumns(w: PortfolioItem) {
    const cols: string[][] = [[], []];
    const heights = [0, 0];
    w.photos.forEach((p, n) => {
      const c = heights[1] < heights[0] - 0.05 ? 1 : 0; // casi empate → izquierda, para no invertir el orden
      heights[c] += photoRatio(p);
      cols[c].push(
        `<img src="${esc(p.src)}" alt="${esc(w.couple)} — foto ${n + 1}" loading="lazy" style="order:${n}" ${sizeAttrs(p)} />`
      );
    });
    return cols.map((c) => `<div class="photos__col">${c.join("")}</div>`).join("");
  }

  function detailHTML(w: PortfolioItem, i: number) {
    const next = works[wrap(i + 1)];
    const poster = w.poster || w.photos[0]?.src || w.cover;
    return `
      <div class="detail__top">
        <span class="eyebrow">${pad(i + 1)} — ${esc(w.collection)}</span>
        <button class="detail__close" data-close>
          Cerrar
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M1 1l12 12M13 1L1 13"/></svg>
        </button>
      </div>
      <h1 class="detail__title">${esc(w.couple)}</h1>
      <div class="detail__meta"><span>${esc(w.place)}</span><span>${esc(w.date)}</span></div>
      <div class="detail__tags">${w.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      <p class="detail__story">${esc(w.story)}</p>

      <div class="detail__label eyebrow"><span>Film</span><span>${esc(w.collection)}</span></div>
      <div class="video" data-video>
        <img src="${esc(poster)}" alt="" loading="lazy" />
        <button class="video__play" aria-label="Reproducir film de ${esc(w.couple)}">
          <span><svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true"><path d="M2 1.5v19L19 11z" fill="#1b1916"/></svg></span>
        </button>
        <span class="video__note">Video próximamente</span>
      </div>

      <div class="detail__label eyebrow"><span>Fotografía</span><span>${w.photos.length} fotos</span></div>
      <div class="photos">${photoColumns(w)}</div>

      <button class="detail__more" data-href="/galeria/${encodeURIComponent(w.id)}">
        Ver historia completa
        <svg width="16" height="16" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 14h20M16 6l8 8-8 8"/></svg>
      </button>

      <button class="detail__next" data-next="${wrap(i + 1)}">
        <span><span class="eyebrow">Siguiente historia</span><strong>${esc(next.couple)}</strong></span>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 14h20M16 6l8 8-8 8"/></svg>
      </button>
    `;
  }

  let swapTimer: ReturnType<typeof setTimeout> | undefined;
  function select(i: number, instant = false) {
    if (i === selected) return;
    selected = i;
    if (swapTimer) clearTimeout(swapTimer);
    const w = works[i];
    const paint = () => {
      detailInner.innerHTML = detailHTML(w, i);
      detailEl.scrollTop = 0;
      detailInner.classList.remove("is-swapping");
    };
    history.replaceState(history.state, "", "#/" + w.id);
    document.title = `${w.couple} — (brosbefore)™`;
    if (instant) return paint();
    detailInner.classList.add("is-swapping");
    swapTimer = later(paint, 280);
  }
  let selectTimer: ReturnType<typeof setTimeout> | undefined;
  function scheduleSelect(i: number) {
    if (selectTimer) clearTimeout(selectTimer);
    selectTimer = later(() => select(i), 220);
  }

  const homeTitle = document.title;
  function open(i: number) {
    goToIndex(i);
    selected = -1;
    select(i, true);
    stopMotion();
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
    history.replaceState(history.state, "", location.pathname);
    document.title = homeTitle;
    scheduleMotion(activeIndex());
    kick();
  }

  on(detailEl, "click", (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-close]")) return close();
    const more = t.closest<HTMLElement>("[data-href]");
    if (more) {
      document.body.classList.remove("is-detail");
      return navigate(more.dataset.href!);
    }
    const nextBtn = t.closest<HTMLElement>("[data-next]");
    if (nextBtn) {
      const i = Number(nextBtn.dataset.next);
      goToIndex(i);
      select(i);
      return;
    }
    const play = t.closest(".video__play");
    if (play && selected >= 0) {
      const box = play.closest<HTMLElement>("[data-video]")!;
      const src = works[selected].video;
      if (!src) {
        box.classList.add("is-mock-clicked");
        return;
      }
      box.innerHTML = /\.mp4($|\?)/.test(src)
        ? `<video src="${esc(src)}" controls autoplay playsinline></video>`
        : `<iframe src="${esc(src)}${src.includes("?") ? "&" : "?"}autoplay=1&rel=0&playsinline=1&enablejsapi=1" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      const frame = box.querySelector("iframe");
      // pide a YouTube que avise sus eventos (para detectar si el dueño bloqueó el embed)
      frame?.addEventListener("load", () =>
        frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*")
      );
    }
  });

  // si YouTube no deja reproducir el video aquí (p. ej. música con copyright), aviso dentro del recuadro
  on(window, "message", (e: MessageEvent) => {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    let data: { event?: string } | undefined;
    try {
      data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }
    if (data?.event !== "onError") return;
    const box = [...detailEl.querySelectorAll<HTMLElement>("[data-video]")].find(
      (b) => b.querySelector("iframe")?.contentWindow === e.source
    );
    if (!box || selected < 0) return;
    const w = works[selected];
    const id = (w.video.match(/embed\/([\w-]+)/) || [])[1];
    box.classList.add("is-blocked");
    box.innerHTML = `<img src="${esc(w.poster || w.photos[0]?.src || w.cover)}" alt="" />
      <a class="video__blocked" href="https://www.youtube.com/watch?v=${esc(id ?? "")}" target="_blank" rel="noopener">
        Este film solo se puede ver en YouTube ↗
      </a>`;
  });

  // ---------- init ----------
  on(window, "resize", layout);
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

  return () => {
    stopMotion();
    ac.abort();
    timers.forEach(clearTimeout);
    cancelAnimationFrame(rafId);
    document.body.classList.remove("is-detail");
    stage.replaceChildren();
  };
}
