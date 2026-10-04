"use client";
// Loader del home: foto de intro + contador mientras se precargan las primeras portadas.
// Se muestra una vez por sesión; tocarlo lo salta. (Port de js/loader.js)
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { SITE } from "@/lib/site";

export function Loader({ covers }: { covers: string[] | null }) {
  const el = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [gone, setGone] = useState(false);
  const started = useRef(false);

  // la foto de intro aparece apenas carga
  useEffect(() => {
    const i = img.current;
    if (!i) return;
    const ready = () => el.current?.classList.add("is-ready");
    if (i.complete) ready();
    else {
      i.addEventListener("load", ready, { once: true });
      i.addEventListener("error", ready, { once: true });
    }
  }, []);

  useEffect(() => {
    // ya se vio en esta sesión (lo marca el script de <head>)
    if (document.documentElement.classList.contains("no-intro")) {
      setGone(true);
      return;
    }
    if (!covers || started.current) return;
    started.current = true;

    const root = el.current!;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const MIN_MS = reduceMotion ? 600 : 2400; // que la foto alcance a verse
    const MAX_MS = 7000; // conexión lenta: no dejar a nadie esperando
    const t0 = performance.now();

    document.body.classList.add("is-intro");
    try {
      sessionStorage.setItem("bb-intro", "1");
    } catch {}

    // precarga de las portadas que se ven al entrar (la activa y sus vecinas)
    const srcs = [...covers.slice(0, 4), ...covers.slice(-3)];
    let loaded = 0;
    const total = Math.max(1, srcs.length);
    srcs.forEach((src) => {
      const i = new Image();
      i.onload = i.onerror = () => loaded++;
      i.src = src;
    });

    let shown = 0;
    let done = false;
    let raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function frame(now: number) {
      if (done) return;
      const elapsed = now - t0;
      // el contador nunca va más rápido que el tiempo mínimo ni que la carga real
      const real = loaded / total;
      const time = Math.min(1, elapsed / MIN_MS);
      const goal = elapsed > MAX_MS ? 1 : Math.min(real, time);
      shown += (goal - shown) * 0.08;
      if (goal === 1 && 1 - shown < 0.004) shown = 1;
      const pct = Math.round(shown * 100);
      count.current!.textContent = String(pct).padStart(3, "0");
      bar.current!.style.transform = `scaleX(${shown})`;
      root.setAttribute("aria-valuenow", String(pct));
      if (shown === 1) return finish();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function finish() {
      if (done) return;
      done = true;
      count.current!.textContent = "100";
      bar.current!.style.transform = "scaleX(1)";
      timers.push(
        setTimeout(
          () => {
            root.classList.add("is-out");
            document.body.classList.remove("is-intro");
            timers.push(setTimeout(() => setGone(true), 1200));
          },
          reduceMotion ? 0 : 250
        )
      );
    }
    root.addEventListener("click", finish);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      root.removeEventListener("click", finish);
      document.body.classList.remove("is-intro");
    };
  }, [covers]);

  if (gone) return null;
  return (
    <div className="loader" ref={el} role="progressbar" aria-label="Cargando" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <img className="loader__img" ref={img} src={asset("assets/intro.webp")} alt="" fetchPriority="high" />
      <div className="loader__center">
        <span className="loader__count" ref={count}>
          000
        </span>
      </div>
      <div className="loader__bottom">
        <img className="loader__logo" src={asset("assets/logo.svg")} alt={SITE.name} />
      </div>
      <div className="loader__bar">
        <i ref={bar} />
      </div>
    </div>
  );
}
