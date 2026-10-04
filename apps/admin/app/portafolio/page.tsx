"use client";
// Portafolio: las historias del carrusel de la home, en su orden (se arrastran para ordenar).
import Link from "next/link";
import { useState } from "react";
import { COVERAGE_LABEL, repo, toCoupleSummaries } from "@bb/core";
import { VisibilityButton } from "@/components/VisibilityButton";
import { resolve, webUrl } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

export default function Portafolio() {
  const db = useDb();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  if (!db) return <p className="eyebrow">Cargando…</p>;

  const summaries = toCoupleSummaries(db, resolve).filter((r) => r.inGallery);
  const inHome = summaries.filter((r) => r.inPortfolio).sort((a, b) => a.portfolioOrder - b.portfolioOrder);
  const rest = summaries.filter((r) => !r.inPortfolio);

  const move = (from: string, to: string) => {
    if (from === to) return;
    const ids = inHome.map((r) => r.id);
    ids.splice(ids.indexOf(to), 0, ids.splice(ids.indexOf(from), 1)[0]);
    repo.reorderPortfolio(ids);
  };
  const shift = (id: string, dir: -1 | 1) => {
    const ids = inHome.map((r) => r.id);
    const i = ids.indexOf(id);
    if (!ids[i + dir]) return;
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    repo.reorderPortfolio(ids);
  };

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">{inHome.length} en la home</span>
          <h1>Portafolio</h1>
        </div>
        <a className="btn btn--ghost" href={webUrl("/")} target="_blank" rel="noopener">
          Ver la home
        </a>
      </header>
      <p className="hint">Arrastra para cambiar el orden del carrusel. El ojo saca la pareja de la home (sigue en la galería).</p>

      <ul className="rows">
        {inHome.map((r, i) => (
          <li
            key={r.id}
            className={`row row--drag${dragId === r.id ? " is-dragging" : ""}${overId === r.id && dragId !== r.id ? " is-over" : ""}`}
            draggable
            onDragStart={(e) => {
              setDragId(r.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(r.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) move(dragId, r.id);
              setDragId(null);
              setOverId(null);
            }}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
          >
            <span className="row__handle" aria-hidden="true">
              ⋮⋮
            </span>
            <span className="row__num eyebrow">{String(i + 1).padStart(2, "0")}</span>
            <span className="row__cover-wrap">{r.cover ? <img className="row__cover" src={r.cover} alt="" style={{ objectPosition: r.coverPos }} /> : <span className="row__cover" />}</span>
            <div className="row__main">
              <strong className="row__title">{r.names}</strong>
              <div className="chips">
                <span className="tag tag--plan">{r.planName}</span>
                {db.coverages
                  .filter((cv) => cv.coupleId === r.id && cv.showInPortfolio)
                  .map((cv) => (
                    <span key={cv.id} className="tag">
                      {COVERAGE_LABEL[cv.type]}
                    </span>
                  ))}
              </div>
            </div>
            <div className="row__actions">
              <button type="button" className="icon-btn" aria-label="Subir" disabled={i === 0} onClick={() => shift(r.id, -1)}>
                ↑
              </button>
              <button type="button" className="icon-btn" aria-label="Bajar" disabled={i === inHome.length - 1} onClick={() => shift(r.id, 1)}>
                ↓
              </button>
              <VisibilityButton label="portafolio" visible onToggle={() => repo.setCoupleVisibility(r.id, { inPortfolio: false })} />
              <Link href={`/historia?id=${r.id}&paso=galeria`} className="btn btn--ghost btn--sm">
                Editar
              </Link>
            </div>
          </li>
        ))}
        {inHome.length === 0 && <li className="hint">No hay parejas en la home.</li>}
      </ul>

      {rest.length > 0 && (
        <>
          <h2 className="subhead">En la galería, fuera de la home</h2>
          <ul className="rows">
            {rest.map((r) => (
              <li key={r.id} className="row is-muted">
                <span className="row__handle" />
                <span className="row__num eyebrow">—</span>
                <span className="row__cover-wrap">{r.cover ? <img className="row__cover" src={r.cover} alt="" /> : <span className="row__cover" />}</span>
                <div className="row__main">
                  <strong className="row__title">{r.names}</strong>
                  <div className="chips">
                    <span className="tag tag--plan">{r.planName}</span>
                  </div>
                </div>
                <div className="row__actions">
                  <VisibilityButton label="portafolio" visible={false} onToggle={() => repo.setCoupleVisibility(r.id, { inPortfolio: true })} />
                  <Link href={`/historia?id=${r.id}&paso=galeria`} className="btn btn--ghost btn--sm">
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
