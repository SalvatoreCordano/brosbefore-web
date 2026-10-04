"use client";
// Parejas: lista maestra de historias (incluye las que no se publican en la web).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COVERAGE_LABEL, repo, toCoupleSummaries } from "@bb/core";
import { Modal } from "@/components/ui";
import { VisibilityButton } from "@/components/VisibilityButton";
import { resolve } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

export default function Parejas() {
  const db = useDb();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [names, setNames] = useState("");
  const [query, setQuery] = useState("");
  if (!db) return <p className="eyebrow">Cargando…</p>;
  const rows = toCoupleSummaries(db, resolve)
    .filter((r) => r.names.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) return;
    const id = await repo.createCouple(names);
    router.push(`/historia?id=${id}&paso=datos`);
  };

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">{db.couples.length} historias</span>
          <h1>Parejas</h1>
        </div>
        <button type="button" className="btn btn--solid" onClick={() => setCreating(true)}>
          + Nueva historia
        </button>
      </header>

      {db.couples.length > 0 && (
        <input className="search" type="search" placeholder="Buscar pareja…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar pareja" />
      )}

      {db.couples.length === 0 ? (
        <div className="empty">
          <p>Todavía no hay historias.</p>
          <button type="button" className="btn btn--solid" onClick={() => setCreating(true)}>
            Crear la primera historia
          </button>
        </div>
      ) : (
        <ul className="rows">
          {rows.map((r) => (
            <li key={r.id} className="row">
              <span className="row__cover-wrap">{r.cover ? <img className="row__cover" src={r.cover} alt="" style={{ objectPosition: r.coverPos }} /> : <span className="row__cover" />}</span>
              <div className="row__main">
                <Link href={`/historia?id=${r.id}`} className="row__title">
                  {r.names}
                </Link>
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
                <span className="row__progress" title="Completitud de la historia">
                  <i style={{ width: `${(r.progress.done / r.progress.total) * 100}%` }} />
                </span>
              </div>
              <div className="row__status">
                {!r.inGallery && <span className="badge">Oculta</span>}
                {r.inPortfolio && <span className="badge badge--ok">En la home</span>}
                {r.portalStatus === "suspended" && <span className="badge badge--warn">Portal suspendido</span>}
              </div>
              <div className="row__actions">
                <VisibilityButton label="galería" visible={r.inGallery} onToggle={() => repo.setCoupleVisibility(r.id, { inGallery: !r.inGallery })} />
                <Link href={`/historia?id=${r.id}`} className="btn btn--ghost btn--sm">
                  Editar
                </Link>
              </div>
            </li>
          ))}
          {rows.length === 0 && <li className="hint">Ninguna pareja coincide con “{query}”.</li>}
        </ul>
      )}

      {creating && (
        <Modal title="Nueva historia" onClose={() => setCreating(false)}>
          <form onSubmit={create} className="modal__form">
            <label className="field">
              <span className="field__label">Nombres de la pareja</span>
              <input autoFocus value={names} placeholder="Ej. Andrea & Sebastián" onChange={(e) => setNames(e.target.value)} />
            </label>
            <p className="hint">Se crea oculta en la web. Después eliges plan, coberturas y subes los archivos.</p>
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--solid" disabled={!names.trim()}>
                Crear y continuar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
