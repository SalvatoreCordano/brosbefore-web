"use client";
// Planes: lo que se ve en la página de planes de la web. Un plan oculto no lo ve el público.
import { useState } from "react";
import { repo, type Plan, type PlanRow } from "@bb/core";
import { Section, TextField, Toggle } from "@/components/ui";
import { webUrl } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

const toPrice = (v: string) => (v.trim() ? Number(v.replace(/[,\s]/g, "")) : Number.NaN);

export default function Planes() {
  const db = useDb();
  const [error, setError] = useState("");
  if (!db) return <p className="eyebrow">Cargando…</p>;

  /** corre un cambio y muestra el motivo si el repo lo rechaza (precio vacío, sin nombre…) */
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };
  const create = () => {
    const name = prompt("Nombre del plan (ej. the story™)");
    if (name?.trim()) run(() => repo.createPlan(name));
  };
  const setRows = (p: Plan, rows: PlanRow[]) => run(() => repo.updatePlan(p.id, { includes: rows }));

  const couplesWith = (id: string) => {
    const n = db.couples.filter((c) => c.planId === id && !c.deletedAt).length;
    return `${n} ${n === 1 ? "pareja" : "parejas"} con este plan`;
  };
  const plans = [...db.plans].sort((a, b) => a.priceFrom - b.priceFrom);

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">
            {plans.filter((p) => p.active).length} visibles de {plans.length}
          </span>
          <h1>Planes</h1>
        </div>
        <div className="row__actions">
          <a className="btn btn--ghost" href={webUrl("/planes")} target="_blank" rel="noopener">
            Ver planes en la web
          </a>
          <button type="button" className="btn btn--solid" onClick={create}>
            Nuevo plan
          </button>
        </div>
      </header>
      <p className="hint">
        Se ordenan por precio en la web. Un plan nuevo nace oculto: ponle precio y actívalo cuando esté listo. Los cambios se guardan al salir de cada campo.
      </p>
      {error && <p className="form-error">{error}</p>}

      {plans.map((p) => (
        <Section
          key={p.id}
          title={`${p.name}${p.active ? "" : " · oculto"}`}
          hint={couplesWith(p.id)}
        >
          <div className="form-grid">
            <TextField label="Nombre" value={p.name} onCommit={(v) => repo.updatePlan(p.id, { name: v })} />
            <TextField label="Inversión desde" prefix="S/" value={String(p.priceFrom)} onCommit={(v) => repo.updatePlan(p.id, { priceFrom: toPrice(v) })} />
            <TextField label="Descripción" value={p.description} multiline rows={2} onCommit={(v) => repo.updatePlan(p.id, { description: v })} />
          </div>
          <div className="form-grid form-grid--2">
            <Toggle label="Mostrar en la web" checked={p.active} onChange={(v) => run(() => repo.updatePlan(p.id, { active: v }))} />
            <Toggle label="Destacado" hint="Solo un plan a la vez" checked={p.featured} onChange={(v) => run(() => repo.updatePlan(p.id, { featured: v }))} />
          </div>

          <h3 className="subhead">Detalle</h3>
          {p.includes.map((r, i) => (
            <div key={i} className="form-grid form-grid--2">
              <TextField label="Título" value={r.label} onCommit={(v) => setRows(p, p.includes.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
              <TextField
                label="Líneas (una por renglón)"
                value={r.lines.join("\n")}
                multiline
                rows={3}
                onCommit={(v) => setRows(p, p.includes.map((x, j) => (j === i ? { ...x, lines: v.split("\n") } : x)))}
              />
              <button type="button" className="link-btn" onClick={() => setRows(p, p.includes.filter((_, j) => j !== i))}>
                Quitar fila
              </button>
            </div>
          ))}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRows(p, [...p.includes, { label: "Nueva fila", lines: [] }])}>
            Agregar fila
          </button>
        </Section>
      ))}
      {plans.length === 0 && <p className="hint">No hay planes. Crea el primero.</p>}
    </>
  );
}
