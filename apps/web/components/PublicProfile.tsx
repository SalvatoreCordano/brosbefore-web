"use client";
// Ficha pública de una pareja: /galeria/{slug}
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toPublicProfile, type CoverageType } from "@bb/core";
import { resolve } from "@/lib/resolve";
import { useDb } from "@/lib/use-db";
import { Footer } from "./Footer";
import { Banner, CoverageTabs, PhotoColumns, VideoPlayer } from "./media";

export function PublicProfile({ slug }: { slug: string }) {
  const db = useDb();
  const profile = useMemo(() => (db ? toPublicProfile(db, slug, resolve) : undefined), [db, slug]);
  const [active, setActive] = useState<CoverageType | null>(null);

  useEffect(() => {
    if (profile) document.title = `${profile.title} — (brosbefore)™`;
  }, [profile]);

  if (profile === undefined) return <main className="page"><p className="eyebrow">Cargando…</p></main>;
  if (profile === null) {
    return (
      <main className="page">
        <span className="eyebrow">Galería</span>
        <h1 className="page__title">Esta historia no está disponible.</h1>
        <Link href="/galeria" className="btn btn--ghost">
          Ver todas las historias
        </Link>
      </main>
    );
  }

  const types = profile.coverages.map((c) => c.type);
  // por defecto la boda (la cobertura principal); las pestañas siguen en orden cronológico
  const current =
    profile.coverages.find((c) => c.type === active) ?? profile.coverages.find((c) => c.type === "boda") ?? profile.coverages[0];

  return (
    <>
      <main className="profile">
        <Banner media={profile.banner} alt={profile.title} className="profile__banner" />

        <div className="page profile__body">
          <header className="profile__head">
            <div>
              <span className="eyebrow">
                <Link href="/galeria">Galería</Link>
                {profile.planName ? ` — ${profile.planName}` : ""}
              </span>
              <h1 className="profile__title">{profile.title}</h1>
              <div className="detail__meta">
                {profile.location && <span>{profile.location}</span>}
                {profile.date && <span>{profile.date}</span>}
              </div>
              {profile.tags.length > 0 && (
                <div className="detail__tags">
                  {profile.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {profile.description && <p className="profile__story">{profile.description}</p>}
          </header>

          {current && (
            <section className="profile__coverage">
              <div className="profile__bar">
                <CoverageTabs types={types} value={current.type} onChange={setActive} />
                <span className="eyebrow">
                  {[current.label, current.location, current.date].filter(Boolean).join(" · ")}
                </span>
              </div>

              {current.videos.map((v, i) => (
                <div key={v.id}>
                  <div className="detail__label eyebrow">
                    <span>{i === 0 ? "Film" : "Video"}</span>
                    <span>{current.label}</span>
                  </div>
                  <VideoPlayer video={v} title={`${current.label} de ${profile.title}`} />
                </div>
              ))}

              {current.moments.map((m) => (
                <div key={m.name} className="moment">
                  <div className="detail__label eyebrow">
                    <span>{m.name}</span>
                    <span>{m.photos.length} fotos</span>
                  </div>
                  <PhotoColumns photos={m.photos} alt={profile.title} />
                </div>
              ))}
            </section>
          )}

          {profile.testimonial && (
            <figure className="testimonial">
              <blockquote>“{profile.testimonial.text}”</blockquote>
              <figcaption className="eyebrow">— {profile.testimonial.signature}</figcaption>
            </figure>
          )}

          <section className="cta-block">
            <p className="cta-block__text">¿Quieren que contemos su historia?</p>
            <div className="cta-block__actions">
              <Link href="/planes" className="btn btn--solid">
                Ver planes
              </Link>
              <button type="button" className="btn btn--ghost">
                Contáctanos
              </button>
            </div>
          </section>

          {profile.next && (
            <Link href={`/galeria/${profile.next.slug}`} className="detail__next">
              <span>
                <span className="eyebrow">Siguiente historia</span>
                <strong>{profile.next.title}</strong>
              </span>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M4 14h20M16 6l8 8-8 8" />
              </svg>
            </Link>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
