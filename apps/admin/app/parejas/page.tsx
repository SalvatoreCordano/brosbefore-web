"use client";
// Parejas: lista maestra de historias (incluye las que no se publican en la web).
import { COVERAGE_LABEL, repo, toCoupleSummaries } from "@bb/core";
import { VisibilityButton } from "@/components/VisibilityButton";
import { asset } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

export default function Parejas() {
  const db = useDb();
  if (!db) return <p className="eyebrow">Cargando…</p>;
  const rows = toCoupleSummaries(db, asset);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">{rows.length} historias</span>
          <h1>Parejas</h1>
        </div>
        <button type="button" className="btn btn--solid" disabled title="Llega en el siguiente paso: editor de historia">
          + Nueva historia
        </button>
      </header>

      {rows.length === 0 ? (
        <div className="empty">
          <p>Todavía no hay historias.</p>
          <button type="button" className="btn btn--solid" disabled>
            Crear la primera historia
          </button>
        </div>
      ) : (
        <ul className="rows">
          {rows.map((r) => (
            <li key={r.id} className="row">
              <img className="row__cover" src={r.cover} alt="" style={{ objectPosition: r.coverPos }} />
              <div className="row__main">
                <strong className="row__title">{r.names}</strong>
                <div className="chips">
                  <span className="tag tag--plan">{r.planName}</span>
                  {r.coverages.map((c) => (
                    <span key={c} className="tag">
                      {COVERAGE_LABEL[c]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="row__meta eyebrow">
                {r.photoCount} fotos · {r.videoCount} {r.videoCount === 1 ? "video" : "videos"}
              </div>
              <div className="row__status">
                {!r.inGallery && <span className="badge">Oculta</span>}
                {r.portalStatus === "suspended" && <span className="badge badge--warn">Portal suspendido</span>}
              </div>
              <div className="row__actions">
                <VisibilityButton
                  label="galería"
                  visible={r.inGallery}
                  onToggle={() => repo.setCoupleVisibility(r.id, { inGallery: !r.inGallery })}
                />
                <button type="button" className="btn btn--ghost btn--sm" disabled title="Llega en el siguiente paso">
                  Editar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
