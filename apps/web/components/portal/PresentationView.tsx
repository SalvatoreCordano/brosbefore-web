"use client";
// La presentación que arma brosbefore para la pareja: entrada, banner, mensaje, música y,
// por cobertura, el film, los videos y las fotos destacadas por momento.
import { useEffect, useRef, useState } from "react";
import type { CoverageType, PresentationView as View } from "@bb/core";
import { Banner, CoverageTabs, PhotoColumns, VideoPlayer } from "../media";

export function PresentationView({ view }: { view: View }) {
  const [opened, setOpened] = useState(false);
  const [active, setActive] = useState<CoverageType | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // al abrir, la música entra con un fundido (el toque de la pareja habilita el audio en iOS)
  const open = () => {
    setOpened(true);
    const a = audio.current;
    if (!a) return;
    a.volume = 0;
    a.play()
      .then(() => {
        setPlaying(true);
        const t0 = performance.now();
        const fade = (now: number) => {
          a.volume = Math.min(0.8, ((now - t0) / 2500) * 0.8);
          if (a.volume < 0.8) requestAnimationFrame(fade);
        };
        requestAnimationFrame(fade);
      })
      .catch(() => {});
  };
  const toggleMusic = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {});
    else {
      a.pause();
      setPlaying(false);
    }
  };
  useEffect(() => () => audio.current?.pause(), []);

  const types = view.coverages.map((c) => c.type);
  const current = view.coverages.find((c) => c.type === active) ?? view.coverages.find((c) => c.type === "boda") ?? view.coverages[0];

  return (
    <main className="pres">
      {view.song && <audio ref={audio} src={view.song.src} loop preload="auto" />}

      {!opened && (
        <div className="pres__intro">
          {view.banner && <Banner media={view.banner} alt="" className="pres__intro-bg" />}
          <div className="pres__intro-body">
            <span className="eyebrow">(brosbefore)™ presenta</span>
            <h1>{view.names}</h1>
            <p>{[view.location, view.date].filter(Boolean).join(" · ")}</p>
            <button type="button" className="btn btn--light" onClick={open}>
              Abrir nuestra historia
            </button>
          </div>
        </div>
      )}

      <Banner media={view.banner} alt={view.names} className="pres__banner" />

      <div className="pres__body">
        <header className="pres__head">
          <span className="eyebrow">{[view.location, view.date].filter(Boolean).join(" · ")}</span>
          <h1 className="profile__title">{view.names}</h1>
        </header>

        {view.message && (
          <figure className="pres__message">
            <blockquote>{view.message}</blockquote>
            {view.signature && <figcaption className="eyebrow">{view.signature}</figcaption>}
          </figure>
        )}

        {current ? (
          <section>
            <div className="profile__bar">
              <CoverageTabs types={types} value={current.type} onChange={setActive} />
              <span className="eyebrow">{[current.label, current.location, current.date].filter(Boolean).join(" · ")}</span>
            </div>
            {current.mainVideo && (
              <>
                <div className="detail__label eyebrow">
                  <span>Film</span>
                  <span>{current.label}</span>
                </div>
                <VideoPlayer video={current.mainVideo} title={`Film de ${current.label}`} />
              </>
            )}
            {current.secondaryVideos.length > 0 && (
              <>
                <div className="detail__label eyebrow">
                  <span>Videos</span>
                  <span>{current.secondaryVideos.length}</span>
                </div>
                <div className="video-grid">
                  {current.secondaryVideos.map((v) => (
                    <VideoPlayer key={v.id} video={v} title={v.name} />
                  ))}
                </div>
              </>
            )}
            {current.moments.map((m) => (
              <div key={m.name} className="moment">
                <div className="detail__label eyebrow">
                  <span>{m.name}</span>
                  <span>{m.photos.length} fotos</span>
                </div>
                <PhotoColumns photos={m.photos} alt={view.names} />
              </div>
            ))}
          </section>
        ) : (
          <p className="empty-note">Todavía no hay fotos ni videos en la presentación.</p>
        )}
      </div>

      {view.song && opened && (
        <button type="button" className={`music${playing ? " is-on" : ""}`} onClick={toggleMusic} aria-pressed={playing}>
          <span className="sound__bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="music__name">{playing ? view.song.name : "Música en pausa"}</span>
        </button>
      )}
    </main>
  );
}
