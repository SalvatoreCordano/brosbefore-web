// Loader del home: foto de intro + contador mientras se precargan las primeras portadas.
// Se muestra una vez por sesión; tocarlo lo salta.
(function () {
  const el = document.getElementById("loader");
  if (!el || document.documentElement.classList.contains("no-intro")) {
    el?.remove();
    return;
  }
  const count = document.getElementById("loaderCount");
  const bar = document.getElementById("loaderBar");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIN_MS = reduceMotion ? 600 : 2400; // que la foto alcance a verse
  const MAX_MS = 7000; // conexión lenta: no dejar a nadie esperando
  const t0 = performance.now();

  document.body.classList.add("is-intro");
  try {
    sessionStorage.setItem("bb-intro", "1");
  } catch (e) {}

  // foto de intro: aparece apenas carga
  const img = el.querySelector(".loader__img");
  const ready = () => el.classList.add("is-ready");
  if (img.complete) ready();
  else img.addEventListener("load", ready, { once: true }), img.addEventListener("error", ready, { once: true });

  // precarga de las portadas que se ven al entrar (la activa y sus vecinas)
  const works = window.WORKS || [];
  const srcs = [...works.slice(0, 4), ...works.slice(-3)].map((w) => w.cover);
  let loaded = 0;
  const total = Math.max(1, srcs.length);
  srcs.forEach((src) => {
    const i = new Image();
    i.onload = i.onerror = () => loaded++;
    i.src = src;
  });

  let shown = 0;
  let done = false;
  function frame(now) {
    if (done) return;
    const elapsed = now - t0;
    // el contador nunca va más rápido que el tiempo mínimo ni que la carga real
    const real = loaded / total;
    const time = Math.min(1, elapsed / MIN_MS);
    const goal = elapsed > MAX_MS ? 1 : Math.min(real, time);
    shown += (goal - shown) * 0.08;
    if (goal === 1 && 1 - shown < 0.004) shown = 1;
    const pct = Math.round(shown * 100);
    count.textContent = String(pct).padStart(3, "0");
    bar.style.transform = `scaleX(${shown})`;
    el.setAttribute("aria-valuenow", pct);
    if (shown === 1) return finish();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function finish() {
    if (done) return;
    done = true;
    count.textContent = "100";
    bar.style.transform = "scaleX(1)";
    setTimeout(() => {
      el.classList.add("is-out");
      document.body.classList.remove("is-intro");
      setTimeout(() => el.remove(), 1200);
    }, reduceMotion ? 0 : 250);
  }
  el.addEventListener("click", finish);
})();
