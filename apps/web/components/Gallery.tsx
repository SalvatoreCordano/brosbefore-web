"use client";
// /galeria: todas las historias publicadas, filtrables por cobertura.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { COVERAGE_LABEL, COVERAGE_ORDER, toGalleryCards, type CoverageType, type GalleryCard } from "@bb/core";
import { resolve } from "@/lib/resolve";
import { useDb } from "@/lib/use-db";

type Filter = "todas" | CoverageType;

export function Gallery() {
  const db = useDb();
  const cards = useMemo(() => (db ? toGalleryCards(db, resolve) : null), [db]);
  const [filter, setFilter] = useState<Filter>("todas");

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todas: cards?.length ?? 0, boda: 0, preboda: 0, pedida: 0 };
    cards?.forEach((card) => card.coverages.forEach((t) => c[t]++));
    return c;
  }, [cards]);
  const shown = cards?.filter((c) => filter === "todas" || c.coverages.includes(filter)) ?? [];
  const filters: Filter[] = ["todas", ...COVERAGE_ORDER.slice().reverse().filter((t) => counts[t])];

  return (
    <main className="page">
      <span className="eyebrow">Galería</span>
      <h1 className="page__title">Historias.</h1>

      <div className="seg seg--filters" role="tablist" aria-label="Filtrar por cobertura">
        {filters.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`seg__btn${filter === f ? " is-on" : ""}`} onClick={() => setFilter(f)}>
            {f === "todas" ? "Todas" : COVERAGE_LABEL[f]}
            <span className="seg__count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {!cards ? (
        <p className="eyebrow">Cargando…</p>
      ) : shown.length === 0 ? (
        <p className="empty-note">Todavía no hay historias publicadas en esta cobertura.</p>
      ) : (
        <ul className="grid">
          {shown.map((c) => (
            <GalleryTile key={c.slug} card={c} />
          ))}
        </ul>
      )}
    </main>
  );
}

function GalleryTile({ card }: { card: GalleryCard }) {
  const ref = useRef<HTMLLIElement>(null);
  const [motion, setMotion] = useState(false);

  // móvil (sin hover): la portada animada corre cuando la tarjeta está centrada en pantalla
  useEffect(() => {
    if (!card.coverMotion || matchMedia("(hover: hover)").matches) return;
    const io = new IntersectionObserver(([e]) => setMotion(e.isIntersecting), { rootMargin: "-40% 0px -40% 0px" });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, [card.coverMotion]);

  return (
    <li
      ref={ref}
      className="tile"
      onMouseEnter={() => card.coverMotion && setMotion(true)}
      onMouseLeave={() => setMotion(false)}
    >
      <Link href={`/galeria/${card.slug}`} className="tile__link">
        <div className="tile__media">
          <img src={card.cover || undefined} alt={card.names} loading="lazy" style={{ objectPosition: card.coverPos }} />
          {motion && card.coverMotion && <MotionCover src={card.coverMotion} />}
        </div>
        <div className="tile__body">
          <strong className="tile__title">{card.names}</strong>
          <span className="eyebrow">
            {card.coverages.map((t) => COVERAGE_LABEL[t]).join(" · ")}
            {card.location ? ` — ${card.location}` : ""}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** MP4/WebM en bucle; si el archivo es un GIF, se muestra como imagen. */
function MotionCover({ src }: { src: string }) {
  const [asImage, setAsImage] = useState(false);
  return asImage ? (
    <img className="tile__motion" src={src} alt="" />
  ) : (
    <video className="tile__motion" src={src} autoPlay muted loop playsInline onError={() => setAsImage(true)} />
  );
}
