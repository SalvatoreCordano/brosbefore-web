"use client";
// Piezas de media compartidas por la ficha pública y el portal.
import { useLayoutEffect, useRef, useState } from "react";
import { COVERAGE_LABEL, type CoverageType, type MediaView } from "@bb/core";
import { photoColumnCount, splitColumns } from "@/lib/columns";

/** Video con portada: al tocar play carga YouTube (embed) o el archivo MP4. */
export function VideoPlayer({ video, title }: { video: MediaView; title: string }) {
  const [playing, setPlaying] = useState(false);
  const poster = video.poster;
  if (playing) {
    return (
      <div className="video">
        {video.external ? (
          <iframe
            src={`${video.external}${video.external.includes("?") ? "&" : "?"}autoplay=1&rel=0&playsinline=1`}
            title={title}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <video src={video.src} controls autoPlay playsInline />
        )}
      </div>
    );
  }
  return (
    <div className="video">
      {poster ? <img src={poster} alt="" loading="lazy" /> : !video.external && video.src ? <video src={`${video.src}#t=0.5`} muted playsInline preload="metadata" /> : null}
      <button className="video__play" aria-label={`Reproducir ${title}`} onClick={() => setPlaying(true)}>
        <span>
          <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
            <path d="M2 1.5v19L19 11z" fill="#1b1916" />
          </svg>
        </span>
      </button>
    </div>
  );
}

/** Fotos en columnas que se leen en orden (1, 2 / 3, 4…): 2 en pantallas normales y más cuando hay ancho (2K, 4K). En móvil, una sola. */
export function PhotoColumns({ photos, alt }: { photos: MediaView[]; alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(2);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setCount(photoColumnCount(el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cols = splitColumns(photos, (p) => (p.w && p.h ? p.h / p.w : 1.25), count);
  return (
    <div className="photos" ref={box}>
      {cols.map((col, ci) => (
        <div className="photos__col" key={ci}>
          {col.map(({ item: p, n }) => (
            <img key={p.id} src={p.src || undefined} alt={`${alt} — foto ${n + 1}`} loading="lazy" width={p.w} height={p.h} style={{ order: n }} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Pestañas Boda / Preboda / Pedida (solo si hay más de una). */
export function CoverageTabs({
  types,
  value,
  onChange,
}: {
  types: CoverageType[];
  value: CoverageType;
  onChange: (t: CoverageType) => void;
}) {
  if (types.length < 2) return null;
  return (
    <div className="seg" role="tablist" aria-label="Cobertura">
      {types.map((t) => (
        <button key={t} role="tab" aria-selected={t === value} className={`seg__btn${t === value ? " is-on" : ""}`} onClick={() => onChange(t)}>
          {COVERAGE_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

/** Banner: foto o video en bucle sin sonido. */
export function Banner({ media, alt, className = "banner" }: { media: MediaView | null; alt: string; className?: string }) {
  if (!media || (!media.src && !media.poster)) return null;
  return (
    <div className={className}>
      {media.kind === "video" && media.src ? (
        <video src={media.src} autoPlay muted loop playsInline poster={media.poster} />
      ) : (
        <img src={media.src || media.poster} alt={alt} />
      )}
    </div>
  );
}
