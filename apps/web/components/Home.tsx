"use client";
// Home: loader de intro + carrusel del portafolio. Los datos salen del repo (hoy el mock).
import { useEffect, useRef, useState } from "react";
import { repo, toPortfolio, type PortfolioItem } from "@bb/core";
import { asset } from "@/lib/asset";
import { mountCarousel } from "@/lib/carousel";
import { Loader } from "./Loader";

export function Home() {
  const [works, setWorks] = useState<PortfolioItem[] | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLElement>(null);
  const detailInner = useRef<HTMLDivElement>(null);
  const hudTitle = useRef<HTMLDivElement>(null);
  const hudMeta = useRef<HTMLDivElement>(null);
  const hudCount = useRef<HTMLDivElement>(null);

  // el body de la home no scrollea (todo pasa en el carrusel y en el panel de detalle)
  useEffect(() => {
    document.body.classList.add("home");
    return () => document.body.classList.remove("home");
  }, []);

  // datos del portafolio; se recargan si el admin los cambia (otra pestaña del mismo sitio)
  useEffect(() => {
    const load = () => repo.getDb().then((db) => setWorks(toPortfolio(db, asset)));
    load();
    return repo.subscribe(load);
  }, []);

  useEffect(() => {
    if (!works) return;
    return mountCarousel(
      {
        stage: stage.current!,
        detail: detail.current!,
        detailInner: detailInner.current!,
        hudTitle: hudTitle.current!,
        hudMeta: hudMeta.current!,
        hudCount: hudCount.current!,
      },
      works
    );
  }, [works]);

  return (
    <>
      <Loader covers={works?.map((w) => w.cover) ?? null} />
      <main>
        <div className="stage" ref={stage} aria-label="Trabajos" />

        <div className="hud" aria-live="polite">
          <div>
            <div className="hud__title" ref={hudTitle} />
            <div className="hud__meta eyebrow" ref={hudMeta} />
          </div>
          <div className="hud__right">
            <div className="hud__count" ref={hudCount} />
            <div className="hud__hint">Scroll para explorar · click para ver</div>
          </div>
        </div>

        <aside className="detail" ref={detail} aria-hidden="true" data-nav-scroll>
          <div className="detail__inner" ref={detailInner} />
        </aside>
      </main>
    </>
  );
}
