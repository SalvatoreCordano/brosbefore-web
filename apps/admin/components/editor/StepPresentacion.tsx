"use client";
// Paso 3 — Presentación: lo que ve la pareja en su portal. Todo se elige entre los archivos
// del paso 2 (o se sube aparte). Se edita en borrador y se publica.
import { useRef, useState } from "react";
import {
  COVERAGE_LABEL,
  COVERAGE_ORDER,
  coverageMoments,
  filesOfCouple,
  repo,
  validateBanner,
  validateSong,
  type MediaFile,
  type PresItemRole,
} from "@bb/core";
import { resolve, webUrl } from "@/lib/asset";
import { MediaPicker, Section, SelectAll, TextField } from "../ui";
import type { StepProps } from "./StoryEditor";

export function StepPresentacion({ db, couple, flash }: StepProps) {
  const pres = db.presentations.find((p) => p.coupleId === couple.id)!;
  const coverages = db.coverages
    .filter((cv) => cv.coupleId === couple.id)
    .sort((a, b) => COVERAGE_ORDER.indexOf(b.type) - COVERAGE_ORDER.indexOf(a.type));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = coverages.find((c) => c.id === activeId) ?? coverages[0];
  const all = filesOfCouple(db, couple.id);
  const songInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const dirty = !pres.publishedAt || pres.updatedAt > pres.publishedAt;

  const items = (role: PresItemRole) =>
    db.presItems
      .filter((i) => i.coverageId === active?.id && i.role === role)
      .sort((a, b) => a.order - b.order)
      .map((i) => i.fileId);

  const uploadBanner = async (file: File) => {
    const v = await validateBanner(file);
    if ("error" in v) return flash(v.error);
    const key = await repo.uploadAsset(file);
    await repo.updatePresentation(couple.id, { banner: { key, kind: v.kind } });
  };
  const uploadSong = async (file: File) => {
    const err = validateSong(file);
    if (err) return flash(err);
    const key = await repo.uploadAsset(file);
    await repo.updatePresentation(couple.id, { songKey: key, songName: file.name.replace(/\.[^.]+$/, "") });
    flash("Canción cargada");
  };

  const bannerFileId = pres.banner?.fileId;
  const bannerUploaded = pres.banner?.key ? resolve(pres.banner.key) : "";

  return (
    <>
      <div className="publish-bar">
        <span>
          {pres.publishedAt ? `Publicada el ${new Date(pres.publishedAt).toLocaleDateString("es-PE")}` : "Nunca publicada"}
          {dirty && pres.publishedAt && <strong> · hay cambios sin publicar</strong>}
        </span>
        <div className="publish-bar__actions">
          <a className="btn btn--ghost btn--sm" href={webUrl(`/portal?preview=${couple.id}`)} target="_blank" rel="noopener">
            Vista previa
          </a>
          <button
            type="button"
            className="btn btn--solid btn--sm"
            disabled={!dirty}
            onClick={async () => {
              await repo.publishPresentation(couple.id);
              flash("Presentación publicada: la pareja ya ve esta versión");
            }}
          >
            Publicar presentación
          </button>
        </div>
      </div>

      <Section title="Banner" hint="Una foto o un video corto en bucle (máx. 20 s). Elígelo de los archivos o súbelo.">
        {bannerUploaded && (
          <div className="banner-preview">
            {pres.banner?.kind === "video" ? <video src={bannerUploaded} muted loop autoPlay playsInline /> : <img src={bannerUploaded} alt="" />}
            <button type="button" className="link-btn" onClick={() => repo.updatePresentation(couple.id, { banner: null })}>
              Quitar
            </button>
          </div>
        )}
        <MediaPicker
          files={all}
          multiple={false}
          selected={bannerFileId ? [bannerFileId] : []}
          onChange={(ids) => {
            const f = all.find((x) => x.id === ids[0]);
            repo.updatePresentation(couple.id, { banner: f ? { fileId: f.id, kind: f.kind } : null });
          }}
          empty="Sube archivos en el paso 2 o carga un banner aparte."
        />
        <button type="button" className="btn btn--ghost btn--sm upload-btn" onClick={() => bannerInput.current?.click()}>
          Subir banner aparte
        </button>
        <input
          ref={bannerInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadBanner(f);
            e.target.value = "";
          }}
        />
      </Section>

      <Section title="Canción (opcional)" hint="MP3 o M4A, hasta 15 MB. Suena en toda la presentación desde que la pareja la abre.">
        {pres.songKey ? (
          <div className="song">
            <audio src={resolve(pres.songKey)} controls preload="none" />
            <span>{pres.songName}</span>
            <button type="button" className="link-btn" onClick={() => repo.updatePresentation(couple.id, { songKey: null, songName: null })}>
              Quitar
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => songInput.current?.click()}>
            Subir canción
          </button>
        )}
        <input
          ref={songInput}
          type="file"
          hidden
          accept="audio/mpeg,audio/mp4,.mp3,.m4a"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadSong(f);
            e.target.value = "";
          }}
        />
      </Section>

      <Section title="Mensaje de brosbefore (opcional)" hint="Si queda vacío, la sección no aparece.">
        <div className="form-grid form-grid--wide">
          <TextField label="Mensaje" multiline rows={5} value={pres.message} onCommit={(v) => repo.updatePresentation(couple.id, { message: v })} />
          <TextField label="Firma" value={pres.messageSignature} onCommit={(v) => repo.updatePresentation(couple.id, { messageSignature: v })} />
        </div>
      </Section>

      {active && (
        <>
          <div className="tabs">
            {coverages.map((cv) => (
              <button key={cv.id} className={`tabs__btn${cv.id === active.id ? " is-on" : ""}`} onClick={() => setActiveId(cv.id)}>
                {COVERAGE_LABEL[cv.type]}
              </button>
            ))}
          </div>
          <CoverageContent coverageId={active.id} db={db} items={items} />
        </>
      )}
    </>
  );
}

function CoverageContent({
  coverageId,
  db,
  items,
}: {
  coverageId: string;
  db: StepProps["db"];
  items: (role: PresItemRole) => string[];
}) {
  const moments = coverageMoments(db, coverageId);
  const videos = moments.flatMap((m) => m.files.filter((f) => f.kind === "video"));
  const main = items("main_video");
  const secondary = items("secondary_video");
  const featured = items("featured_photo");
  const setFeaturedFor = (momentFiles: MediaFile[], ids: string[]) => {
    const others = featured.filter((id) => !momentFiles.some((f) => f.id === id));
    const ordered = moments.flatMap((m) => m.files).filter((f) => others.includes(f.id) || ids.includes(f.id));
    return repo.setPresItems(coverageId, "featured_photo", ordered.map((f) => f.id));
  };

  if (!moments.length) return <p className="hint">Sube archivos a esta cobertura en el paso 2.</p>;
  return (
    <>
      <Section title="Video principal" hint="Uno por cobertura. Para verse en la web tiene que ser MP4 (H.264).">
        <MediaPicker
          files={videos}
          multiple={false}
          selected={main}
          onChange={(ids) => {
            repo.setPresItems(coverageId, "main_video", ids);
            if (ids[0]) repo.setPresItems(coverageId, "secondary_video", secondary.filter((x) => x !== ids[0]));
          }}
          empty="No hay videos en esta cobertura."
        />
      </Section>
      {videos.length > 1 && (
        <Section title="Videos secundarios" hint="Opcionales, en el orden de los archivos.">
          <MediaPicker files={videos.filter((v) => !main.includes(v.id))} selected={secondary} onChange={(ids) => repo.setPresItems(coverageId, "secondary_video", ids)} />
        </Section>
      )}
      <Section title="Fotos destacadas" hint={`${featured.length} elegidas. Se muestran agrupadas por momento; el resto queda solo en las descargas.`}>
        {moments.map(({ moment, files }) => {
          const photos = files.filter((f) => f.kind === "photo");
          if (!photos.length) return null;
          const sel = featured.filter((id) => photos.some((p) => p.id === id));
          return (
            <div key={moment.id} className="picker-group">
              <div className="picker-group__head">
                <strong>{moment.name}</strong>
                <span className="eyebrow">
                  {sel.length}/{photos.length}
                </span>
                <SelectAll files={photos} selected={sel} onChange={(ids) => setFeaturedFor(photos, ids)} />
              </div>
              <MediaPicker files={photos} selected={sel} onChange={(ids) => setFeaturedFor(photos, ids)} />
            </div>
          );
        })}
      </Section>
    </>
  );
}
