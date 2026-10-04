"use client";
// Portafolio: las historias que aparecen en el carrusel de la home, en su orden.
import { COVERAGE_LABEL, repo, toCoupleSummaries } from "@bb/core";
import { VisibilityButton } from "@/components/VisibilityButton";
import { asset } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

export default function Portafolio() {
  const db = useDb();
  if (!db) return <p className="eyebrow">Cargando…</p>;
  const order = new Map(db.couples.map((c) => [c.id, c.portfolioOrder]));
  // las visibles en galería, primero las del portafolio en su orden
  const rows = toCoupleSummaries(db, asset)
    .filter((r) => r.inGallery)
    .sort((a, b) => Number(b.inPortfolio) - Number(a.inPortfolio) || order.get(a.id)! - order.get(b.id)!);
  const count = rows.filter((r) => r.inPortfolio).length;

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">{count} en la home</span>
          <h1>Portafolio</h1>
        </div>
      </header>
      <p className="hint">
        El orden de esta lista es el orden del carrusel. Ordenar arrastrando llega en el siguiente paso.
      </p>

      <ul className="rows">
        {rows.map((r, i) => (
          <li key={r.id} className={`row${r.inPortfolio ? "" : " is-muted"}`}>
            <span className="row__num eyebrow">{r.inPortfolio ? String(i + 1).padStart(2, "0") : "—"}</span>
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
            <div className="row__actions">
              <VisibilityButton
                label="portafolio"
                visible={r.inPortfolio}
                onToggle={() => repo.setCoupleVisibility(r.id, { inPortfolio: !r.inPortfolio })}
              />
              <button type="button" className="btn btn--ghost btn--sm" disabled title="Llega en el siguiente paso">
                Editar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
