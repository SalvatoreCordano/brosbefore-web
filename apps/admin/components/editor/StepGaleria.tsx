"use client";
// Paso 4 — Galería pública: lo que se ve en la web (/galeria y, si se publica, la home).
import { useRef, useState } from "react";
import {
  COVERAGE_LABEL,
  COVERAGE_ORDER,
  coverageMoments,
  filesOfCouple,
  repo,
  validateBanner,
  validateMotionCover,
  type PublicScope,
} from "@bb/core";
import { resolve, webUrl } from "@/lib/asset";
import { MediaPicker, Section, SelectAll, TextField, Toggle } from "../ui";
import type { StepProps } from "./StoryEditor";

export function StepGaleria({ db, couple, flash }: StepProps) {
  const profile = db.publicProfiles.find((p) => p.coupleId === couple.id)!;
  const coverages = db.coverages
    .filter((cv) => cv.coupleId === couple.id)
    .sort((a, b) => COVERAGE_ORDER.indexOf(b.type) - COVERAGE_ORDER.indexOf(a.type));
  const all = filesOfCouple(db, couple.id);
  const photos = all.filter((f) => f.kind === "photo");
  // primero las verticales: la portada es una card 4:5
  const coverChoices = [...photos].sort((a, b) => Number((b.height ?? 0) > (b.width ?? 0)) - Number((a.height ?? 0) > (a.width ?? 0)));
  const motionInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);
  const off = !couple.inGallery;

  const setVisible = async (v: boolean) => {
    if (v && !profile.coverFileId && !photos.length) flash("Sube fotos en el paso 2 para elegir la portada");
    await repo.setCoupleVisibility(couple.id, { inGallery: v });
  };
  const uploadMotion = async (file: File) => {
    const err = await validateMotionCover(file);
    if (err) return flash(err);
    await repo.updatePublicProfile(couple.id, { coverMotionKey: await repo.uploadAsset(file) });
    flash("Portada animada cargada");
  };
  const uploadBanner = async (file: File) => {
    const v = await validateBanner(file);
    if ("error" in v) return flash(v.error);
    await repo.updatePublicProfile(couple.id, { banner: { key: await repo.uploadAsset(file), kind: v.kind } });
  };

  return (
    <>
      <div className="publish-bar">
        <Toggle
          checked={couple.inGallery}
          onChange={setVisible}
          label="Visible en galería"
          hint={couple.inGallery ? "Aparece en /galeria y tiene su ficha pública" : "Oculta: no aparece en la web (su portal sigue igual)"}
        />
        <div className="publish-bar__actions">
          <a className={`btn btn--ghost btn--sm${off ? " is-disabled" : ""}`} href={webUrl(`/galeria/${couple.slug}`)} target="_blank" rel="noopener">
            Ver ficha pública
          </a>
        </div>
      </div>

      <fieldset className="lockable" disabled={off}>
        {off && <p className="lock-note">Activa “Visible en galería” para configurar la ficha pública.</p>}

        <Section title="Portada" hint="Foto vertical (4:5). Se usa en la galería y en el carrusel de la home.">
          <MediaPicker
            files={coverChoices}
            multiple={false}
            selected={profile.coverFileId ? [profile.coverFileId] : []}
            onChange={(ids) => repo.updatePublicProfile(couple.id, { coverFileId: ids[0] ?? null })}
            empty="Sube fotos en el paso 2."
          />
        </Section>

        <Section
          title="Portada animada (opcional)"
          hint="MP4 o WebM vertical, máx. 15 s y 15 MB (GIF hasta 8 MB). En la galería se reproduce al pasar el mouse; en la home, cuando la card lleva 2 s como principal."
        >
          {profile.coverMotionKey ? (
            <div className="motion-preview">
              <video src={resolve(profile.coverMotionKey)} muted loop autoPlay playsInline />
              <button type="button" className="link-btn" onClick={() => repo.updatePublicProfile(couple.id, { coverMotionKey: null })}>
                Quitar
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => motionInput.current?.click()}>
              Subir portada animada
            </button>
          )}
          <input
            ref={motionInput}
            type="file"
            hidden
            accept="video/mp4,video/webm,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMotion(f);
              e.target.value = "";
            }}
          />
        </Section>

        <Section title="Banner de la ficha" hint="Foto o video horizontal para la cabecera de su página.">
          {profile.banner?.key && (
            <div className="banner-preview">
              {profile.banner.kind === "video" ? <video src={resolve(profile.banner.key)} muted loop autoPlay playsInline /> : <img src={resolve(profile.banner.key)} alt="" />}
              <button type="button" className="link-btn" onClick={() => repo.updatePublicProfile(couple.id, { banner: null })}>
                Quitar
              </button>
            </div>
          )}
          <MediaPicker
            files={all}
            multiple={false}
            selected={profile.banner?.fileId ? [profile.banner.fileId] : []}
            onChange={(ids) => {
              const f = all.find((x) => x.id === ids[0]);
              repo.updatePublicProfile(couple.id, { banner: f ? { fileId: f.id, kind: f.kind } : null });
            }}
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

        <Section title="Texto">
          <div className="form-grid form-grid--wide">
            <TextField label="Título" value={profile.title} onCommit={(v) => repo.updatePublicProfile(couple.id, { title: v })} />
            <TextField label="Descripción (la historia de la pareja)" multiline rows={5} value={profile.description} onCommit={(v) => repo.updatePublicProfile(couple.id, { description: v })} />
          </div>
          <TagEditor db={db} coupleId={couple.id} />
        </Section>

        <Section title="Coberturas en la web" hint="Solo se pueden encender las que tienen archivos. Elige qué fotos y videos se muestran en la ficha (una selección, no todo).">
          {coverages.map((cv) => (
            <ScopeEditor key={cv.id} db={db} coverageId={cv.id} scope="gallery" label={COVERAGE_LABEL[cv.type]} enabled={cv.showInGallery} onToggle={(v) => repo.setCoverageFlags(cv.id, { showInGallery: v })} />
          ))}
        </Section>

        <Section title="Portafolio (carrusel de la home)">
          <Toggle
            checked={couple.inPortfolio}
            onChange={(v) => repo.setCoupleVisibility(couple.id, { inPortfolio: v })}
            label="Publicar en portafolio"
            hint={couple.inPortfolio ? "Aparece en el carrusel de la home (el orden se cambia en Portafolio)" : "No aparece en la home"}
          />
          <fieldset className="lockable" disabled={!couple.inPortfolio}>
            <p className="hint">Elige qué coberturas salen en la home y una selección reducida: recomendado, un video y entre 6 y 12 fotos.</p>
            {coverages.map((cv) => (
              <ScopeEditor
                key={cv.id}
                db={db}
                coverageId={cv.id}
                scope="portfolio"
                label={COVERAGE_LABEL[cv.type]}
                enabled={cv.showInPortfolio}
                onToggle={(v) => repo.setCoverageFlags(cv.id, { showInPortfolio: v })}
              />
            ))}
            <a className="btn btn--ghost btn--sm" href={webUrl(`/#/${couple.slug}`)} target="_blank" rel="noopener">
              Ver en la home
            </a>
          </fieldset>
        </Section>
      </fieldset>
    </>
  );
}

function ScopeEditor({
  db,
  coverageId,
  scope,
  label,
  enabled,
  onToggle,
}: {
  db: StepProps["db"];
  coverageId: string;
  scope: PublicScope;
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const files = coverageMoments(db, coverageId).flatMap((m) => m.files);
  const selected = db.publicItems
    .filter((i) => i.coverageId === coverageId && i.scope === scope)
    .sort((a, b) => a.order - b.order)
    .map((i) => i.fileId)
    .filter((id) => files.some((f) => f.id === id));
  const set = (ids: string[]) => repo.setPublicItems(coverageId, scope, ids);
  return (
    <div className="scope">
      <div className="scope__head">
        <Toggle
          checked={enabled && files.length > 0}
          disabled={!files.length}
          onChange={onToggle}
          label={label}
          hint={files.length ? `${selected.length} de ${files.length} elegidos` : "Sube archivos en el paso 2"}
        />
        {enabled && files.length > 0 && <SelectAll files={files} selected={selected} onChange={set} />}
      </div>
      {enabled && files.length > 0 && <MediaPicker files={files} selected={selected} onChange={set} />}
    </div>
  );
}

function TagEditor({ db, coupleId }: { db: StepProps["db"]; coupleId: string }) {
  const ids = new Set(db.coupleTags.filter((t) => t.coupleId === coupleId).map((t) => t.tagId));
  const current = db.tags.filter((t) => ids.has(t.id)).map((t) => t.name);
  const suggestions = db.tags.map((t) => t.name).filter((n) => !current.includes(n));
  const [draft, setDraft] = useState("");
  const add = (name: string) => {
    const n = name.trim();
    if (!n || current.some((c) => c.toLowerCase() === n.toLowerCase())) return setDraft("");
    repo.setTags(coupleId, [...current, n]);
    setDraft("");
  };
  return (
    <div className="field tag-editor">
      <span className="field__label">Etiquetas (escribe y presiona Enter; sugiere las que ya existen)</span>
      <div className="tag-editor__box">
        {current.map((t) => (
          <span key={t} className="tag tag--removable">
            {t}
            <button type="button" aria-label={`Quitar ${t}`} onClick={() => repo.setTags(coupleId, current.filter((c) => c !== t))}>
              ×
            </button>
          </span>
        ))}
        <input
          list={`tags-${coupleId}`}
          value={draft}
          placeholder="Ej. Análogo 35mm"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => draft && add(draft)}
        />
        <datalist id={`tags-${coupleId}`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
    </div>
  );
}
