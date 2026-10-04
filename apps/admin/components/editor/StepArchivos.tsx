"use client";
// Paso 2 — Archivos: todo el material entregable, por cobertura.
// Cada carpeta subida se vuelve un momento. Se aceptan carpetas, archivos sueltos y .zip
// (se descomprimen en el navegador).
import { useRef, useState } from "react";
import {
  COVERAGE_LABEL,
  COVERAGE_ORDER,
  coverageMoments,
  expandZips,
  filesFromDrop,
  filesFromInput,
  filesOfCouple,
  formatBytes,
  momentNameFromPath,
  readMediaMeta,
  repo,
  validateDeliverable,
  type NewFile,
  type PickedFile,
} from "@bb/core";
import { Section, Thumb } from "../ui";
import type { StepProps } from "./StoryEditor";

export function StepArchivos({ db, couple, flash }: StepProps) {
  const coverages = db.coverages
    .filter((cv) => cv.coupleId === couple.id)
    .sort((a, b) => COVERAGE_ORDER.indexOf(b.type) - COVERAGE_ORDER.indexOf(a.type));
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = coverages.find((c) => c.id === activeId) ?? coverages[0];
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const folderInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);

  const all = filesOfCouple(db, couple.id);
  const unpublished = all.filter((f) => !f.published).length;

  if (!active) {
    return <p className="hint">Primero elige al menos una cobertura en el paso Datos.</p>;
  }
  const moments = coverageMoments(db, active.id);
  const count = moments.reduce((s, m) => s + m.files.length, 0);
  const size = moments.reduce((s, m) => s + m.files.reduce((x, f) => x + (f.sizeBytes ?? 0), 0), 0);

  const ingest = async (picked: PickedFile[]) => {
    if (!picked.length || progress) return;
    setRejected([]);
    setProgress({ label: "Leyendo archivos", done: 0, total: picked.length });
    let expanded: PickedFile[];
    try {
      expanded = await expandZips(picked);
    } catch {
      setProgress(null);
      return flash("No se pudo abrir el .zip");
    }
    const bad: { name: string; reason: string }[] = [];
    const good: NewFile[] = [];
    // orden: por carpeta y luego por fecha del archivo (aproxima la fecha de captura)
    expanded.sort((a, b) => a.path.localeCompare(b.path, "es", { numeric: true }) || a.file.lastModified - b.file.lastModified);
    for (const p of expanded) {
      if (p.file.name.startsWith(".")) continue;
      const v = validateDeliverable(p.file.name, p.file.size);
      if (!v.ok) {
        bad.push({ name: p.path, reason: v.reason });
        continue;
      }
      const meta = await readMediaMeta(p.file, v.kind);
      good.push({
        momentName: momentNameFromPath(p.path),
        blob: p.file,
        name: p.file.name,
        kind: v.kind,
        ...meta,
        takenAt: new Date(p.file.lastModified).toISOString(),
      });
    }
    setRejected(bad);
    if (good.length) {
      setProgress({ label: "Subiendo", done: 0, total: good.length });
      await repo.addFiles(active.id, good, (done) => setProgress({ label: "Subiendo", done, total: good.length }));
      flash(`${good.length} archivos subidos a ${COVERAGE_LABEL[active.type]}`);
    }
    setProgress(null);
  };

  const momentOptions = moments.map((m) => m.moment);

  return (
    <>
      <div className="publish-bar">
        <span>
          {all.length} archivos en total
          {unpublished > 0 ? (
            <strong> · {unpublished} sin publicar (la pareja todavía no los ve)</strong>
          ) : all.length ? (
            " · todo publicado"
          ) : (
            ""
          )}
        </span>
        <button
          type="button"
          className="btn btn--solid btn--sm"
          disabled={!unpublished}
          onClick={async () => {
            await repo.publishFiles(couple.id);
            flash("Archivos publicados: ya aparecen en las descargas del portal");
          }}
        >
          Publicar archivos
        </button>
      </div>

      <div className="tabs">
        {coverages.map((cv) => (
          <button key={cv.id} className={`tabs__btn${cv.id === active.id ? " is-on" : ""}`} onClick={() => setActiveId(cv.id)}>
            {COVERAGE_LABEL[cv.type]}
          </button>
        ))}
      </div>

      <Section
        title={`Archivos de ${COVERAGE_LABEL[active.type].toLowerCase()}`}
        hint={`${count} archivos${size ? ` · ${formatBytes(size)}` : ""} · ${moments.length} momentos`}
      >
        <div
          className={`drop${over ? " is-over" : ""}${progress ? " is-busy" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setOver(false);
            ingest(await filesFromDrop(e.dataTransfer));
          }}
        >
          {progress ? (
            <div className="drop__progress">
              {progress.label}… {progress.done}/{progress.total}
              <span className="bar">
                <i style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </span>
            </div>
          ) : (
            <>
              <strong>Arrastra aquí las carpetas de la {COVERAGE_LABEL[active.type].toLowerCase()}</strong>
              <span className="hint">Cada carpeta se vuelve un momento (ej. “03 Ceremonia” → Ceremonia). También archivos sueltos o un .zip.</span>
              <div className="drop__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => folderInput.current?.click()}>
                  Elegir carpeta
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => filesInput.current?.click()}>
                  Elegir archivos o .zip
                </button>
              </div>
              <span className="hint">Fotos JPG, PNG o WebP (hasta 50 MB) · Videos MP4 o MOV (hasta 20 GB) · Sin RAW.</span>
            </>
          )}
          <input
            ref={folderInput}
            type="file"
            hidden
            multiple
            {...({ webkitdirectory: "" } as Record<string, string>)}
            onChange={(e) => {
              if (e.target.files) ingest(filesFromInput(e.target.files));
              e.target.value = "";
            }}
          />
          <input
            ref={filesInput}
            type="file"
            hidden
            multiple
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,.zip,.mov,.m4v"
            onChange={(e) => {
              if (e.target.files) ingest(filesFromInput(e.target.files));
              e.target.value = "";
            }}
          />
        </div>

        {rejected.length > 0 && (
          <div className="rejected">
            <strong>{rejected.length} archivos no se subieron:</strong>
            <ul>
              {rejected.slice(0, 8).map((r) => (
                <li key={r.name}>
                  {r.name} — {r.reason}
                </li>
              ))}
              {rejected.length > 8 && <li>…y {rejected.length - 8} más</li>}
            </ul>
          </div>
        )}

        {moments.length === 0 ? (
          <p className="hint">Todavía no hay archivos en esta cobertura.</p>
        ) : (
          moments.map(({ moment, files }, mi) => (
            <div key={moment.id} className="moment-block">
              <div className="moment-block__head">
                <MomentName id={moment.id} name={moment.name} />
                <span className="eyebrow">{files.length} archivos</span>
                <div className="moment-block__actions">
                  <button type="button" className="icon-btn" aria-label="Subir momento" disabled={mi === 0} onClick={() => repo.moveMoment(moment.id, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Bajar momento"
                    disabled={mi === moments.length - 1}
                    onClick={() => repo.moveMoment(moment.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="link-btn link-btn--danger"
                    onClick={() => confirm(`¿Eliminar “${moment.name}” y sus ${files.length} archivos?`) && repo.deleteMoment(moment.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <ul className="file-grid">
                {files.map((f, fi) => (
                  <li key={f.id} className="file-card">
                    <Thumb file={f} />
                    {!f.published && <span className="file-card__new" title="Sin publicar" />}
                    <span className="file-card__name" title={f.name}>
                      {f.name}
                    </span>
                    <div className="file-card__actions">
                      <button type="button" className="mini-btn" aria-label="Mover antes" disabled={fi === 0} onClick={() => repo.shiftFile(f.id, -1)}>
                        ←
                      </button>
                      <button type="button" className="mini-btn" aria-label="Mover después" disabled={fi === files.length - 1} onClick={() => repo.shiftFile(f.id, 1)}>
                        →
                      </button>
                      {momentOptions.length > 1 && (
                        <select className="mini-select" value={moment.id} aria-label="Mover a otro momento" onChange={(e) => repo.moveFile(f.id, e.target.value)}>
                          {momentOptions.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="button" className="mini-btn mini-btn--danger" aria-label={`Eliminar ${f.name}`} onClick={() => repo.deleteFile(f.id)}>
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Section>
    </>
  );
}

function MomentName({ id, name }: { id: string; name: string }) {
  const [v, setV] = useState(name);
  return (
    <input
      className="moment-name"
      value={v}
      aria-label="Nombre del momento"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => (v.trim() && v !== name ? repo.renameMoment(id, v) : setV(name))}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
