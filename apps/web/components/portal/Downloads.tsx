"use client";
// Archivos de la pareja: descarga por archivo, por momento (carpeta), por cobertura o todo.
// Las descargas múltiples se arman como .zip en el navegador, sin costo de servidor.
import { useState } from "react";
import { downloadUrl, downloadZip, formatBytes, type DownloadsView, type MediaView } from "@bb/core";
import { openViewer } from "@/lib/viewer";

type Item = { path: string; file: MediaView };

export function Downloads({ view, names }: { view: DownloadsView; names: string }) {
  const [busy, setBusy] = useState<{ label: string; done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const base = names.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

  const zipItems = async (items: Item[], zipName: string, label: string) => {
    const downloadable = items.filter((i) => i.file.src); // los films de YouTube no se descargan
    if (!downloadable.length) return;
    setError("");
    setBusy({ label, done: 0, total: downloadable.length });
    try {
      await downloadZip(
        downloadable.map((i) => ({ path: i.path, url: i.file.src })),
        zipName,
        (done, total) => setBusy({ label, done, total })
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo armar la descarga");
    } finally {
      setBusy(null);
    }
  };

  /** abre las fotos del momento en grande, empezando por la elegida */
  const openMoment = (files: MediaView[], id: string) => {
    const photos = files.filter((f) => f.kind === "photo" && f.src);
    const at = photos.findIndex((f) => f.id === id);
    if (at < 0) return;
    openViewer(
      photos.map((f) => ({ src: f.src, msrc: f.thumb, w: f.w, h: f.h, alt: f.name })),
      at,
      (k) => document.querySelector<HTMLElement>(`[data-file="${photos[k].id}"] img`)
    );
  };

  if (!view.count) {
    return (
      <main className="portal__state">
        <h1>Sus archivos se están preparando.</h1>
        <p>Cuando estén listos aparecerán aquí para descargar.</p>
      </main>
    );
  }

  const all: Item[] = view.coverages.flatMap((cv) =>
    cv.moments.flatMap((m) => m.files.map((file) => ({ path: `${cv.label}/${m.name}/${file.name}`, file })))
  );

  return (
    <main className="downloads">
      <header className="downloads__head">
        <div>
          <span className="eyebrow">Archivos</span>
          <h1>Su material</h1>
          <p className="eyebrow">
            {view.count} archivos{view.size ? ` · ${formatBytes(view.size)}` : ""} · solo fotos y videos
          </p>
        </div>
        <button type="button" className="btn btn--solid" disabled={!!busy} onClick={() => zipItems(all, `${base}.zip`, "todo")}>
          Descargar todo (.zip)
        </button>
      </header>

      {busy && (
        <div className="progress" role="status">
          Preparando {busy.label}… {busy.done}/{busy.total}
          <i style={{ transform: `scaleX(${busy.done / busy.total})` }} />
        </div>
      )}
      {error && <p className="form-error">{error}</p>}

      {view.coverages.map((cv) => (
        <section key={cv.type} className="dl-coverage">
          <div className="dl-coverage__head">
            <h2>{cv.label}</h2>
            <span className="eyebrow">
              {cv.count} archivos{cv.size ? ` · ${formatBytes(cv.size)}` : ""}
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={!!busy}
              onClick={() =>
                zipItems(
                  cv.moments.flatMap((m) => m.files.map((file) => ({ path: `${m.name}/${file.name}`, file }))),
                  `${base}-${cv.label}.zip`,
                  cv.label
                )
              }
            >
              Descargar {cv.label.toLowerCase()}
            </button>
          </div>

          {cv.moments.map((m) => (
            <div key={m.id} className="dl-moment">
              <div className="dl-moment__head">
                <span className="dl-moment__name">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  {m.name}
                </span>
                <span className="eyebrow">
                  {m.files.length} archivos{m.size ? ` · ${formatBytes(m.size)}` : ""}
                </span>
                <button
                  type="button"
                  className="link-btn"
                  disabled={!!busy}
                  onClick={() => zipItems(m.files.map((file) => ({ path: file.name, file })), `${base}-${cv.label}-${m.name}.zip`, m.name)}
                >
                  Descargar carpeta
                </button>
              </div>
              <ul className="dl-files">
                {m.files.map((f) => (
                  <li key={f.id} className="dl-file" data-file={f.id}>
                    <div className="dl-file__thumb">
                      {f.kind === "photo" ? (
                        // en grande se abre el original (la pareja tiene derecho a verlo con todo el detalle)
                        <button type="button" className="dl-file__open" aria-label={`Ver ${f.name} en grande`} onClick={() => openMoment(m.files, f.id)}>
                          <img src={f.thumb || f.src || undefined} alt="" loading="lazy" />
                        </button>
                      ) : f.poster ? (
                        <img src={f.poster} alt="" loading="lazy" />
                      ) : (
                        <span className="dl-file__video">Video</span>
                      )}
                    </div>
                    <span className="dl-file__name" title={f.name}>
                      {f.name}
                    </span>
                    {f.src ? (
                      <button type="button" className="icon-btn" aria-label={`Descargar ${f.name}`} onClick={() => downloadUrl(f.src, f.name)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                          <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />
                        </svg>
                      </button>
                    ) : (
                      f.external && (
                        <a className="link-btn" href={f.external.replace("/embed/", "/watch?v=")} target="_blank" rel="noopener">
                          Ver
                        </a>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <p className="hint">En la demo, los films alojados en YouTube se ven desde ahí; con R2 se descargarán como MP4.</p>
    </main>
  );
}
