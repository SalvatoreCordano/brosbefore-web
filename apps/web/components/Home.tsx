"use client";
// Home: loader de intro + carrusel del portafolio. Los datos salen del repo (hoy el mock).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { repo, toPortfolio, type PortfolioItem } from "@bb/core";
import { mountCarousel } from "@/lib/carousel";
import { resolve } from "@/lib/resolve";
import { Loader } from "./Loader";

export function Home() {
  const router = useRouter();
  const [works, setWorks] = useState<PortfolioItem[] | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLElement>(null);
  const detailInner = useRef<HTMLDivElement>(null);
  const hudTitle = useRef<HTMLDivElement>(null);
  const hudMeta = useRef<HTMLDivElement>(null);

  // el body de la home no scrollea (todo pasa en el carrusel y en el panel de detalle)
  useEffect(() => {
    document.body.classList.add("home");
    return () => document.body.classList.remove("home");
  }, []);

  // datos del portafolio; se recargan si el admin los cambia (otra pestaña del mismo sitio).
  // Solo se vuelve a armar el carrusel si cambió el contenido, no en cada aviso.
  useEffect(() => {
    let last = "";
    const load = () =>
      repo.getDb().then((db) => {
        const next = toPortfolio(db, resolve);
        const sig = JSON.stringify(next);
        if (sig !== last) {
          last = sig;
          setWorks(next);
        }
      });
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
      },
      works,
      (href) => router.push(href)
    );
  }, [works, router]);

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
            <Link href="/galeria" className="hud__cta">
              Ver galería
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 14h20M16 6l8 8-8 8" />
              </svg>
            </Link>
          </div>
        </div>

        {works && works.length === 0 && (
          <div className="home-empty">
            <p className="eyebrow">Todavía no hay historias en el portafolio.</p>
            <Link href="/galeria" className="btn btn--ghost">
              Ver galería
            </Link>
          </div>
        )}

        <aside className="detail" ref={detail} aria-hidden="true" data-nav-scroll>
          <div className="detail__inner" ref={detailInner} />
        </aside>
      </main>
    </>
  );
}
