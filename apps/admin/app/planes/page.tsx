"use client";
// Planes: lo que se ve en la página de planes de la web, en una pestaña por categoría (Wedding, Dates, Proposal).
// Un plan oculto no lo ve el público.
import { useState } from "react";
import { PLAN_CATEGORIES, byPlanPrice, repo, type Plan, type PlanCategory, type PlanRow } from "@bb/core";
import { Section, TextField, Toggle } from "@/components/ui";
import { webUrl } from "@/lib/asset";
import { useDb } from "@/lib/use-db";

// vacío = sin precio: la web muestra "Consultar precio"
const toPrice = (v: string) => (v.trim() ? Number(v.replace(/[,\s]/g, "")) : 0);

export default function Planes() {
  const db = useDb();
  const [error, setError] = useState("");
  if (!db) return <p className="eyebrow">Cargando…</p>;

  /** corre un cambio y muestra el motivo si el repo lo rechaza (precio inválido, sin nombre…) */
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };
  const create = (category: PlanCategory, label: string) => {
    const name = prompt(`Nombre del plan en ${label} (ej. the story™)`);
    if (name?.trim()) run(() => repo.createPlan(name, category));
  };
  const setRows = (p: Plan, rows: PlanRow[]) => run(() => repo.updatePlan(p.id, { includes: rows }));
  const couplesWith = (id: string) => {
    const n = db.couples.filter((c) => c.planId === id && !c.deletedAt).length;
    return `${n} ${n === 1 ? "pareja" : "parejas"} con este plan`;
  };

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">
            {db.plans.filter((p) => p.active).length} visibles de {db.plans.length}
          </span>
          <h1>Planes</h1>
        </div>
        <a className="btn btn--ghost" href={webUrl("/planes")} target="_blank" rel="noopener">
          Ver planes en la web
        </a>
      </header>
      <p className="hint">
        En la web cada categoría es una pestaña (solo aparecen las que tienen algún plan visible). Dentro de cada una se ordenan por precio. Un plan
        nuevo nace oculto: actívalo cuando esté listo. Si dejas el precio vacío, la web muestra &quot;Consultar precio&quot;. Los cambios se guardan al
        salir de cada campo.
      </p>
      {error && <p className="form-error">{error}</p>}

      {PLAN_CATEGORIES.map((cat) => {
        const plans = db.plans.filter((p) => p.category === cat.id).sort(byPlanPrice);
        return (
          <div key={cat.id}>
            <div className="page-head">
              <h2 className="subhead">
                {cat.label}{" "}
                <span className="eyebrow">
                  {plans.filter((p) => p.active).length} visibles de {plans.length}
                </span>
              </h2>
              <button type="button" className="btn btn--solid btn--sm" onClick={() => create(cat.id, cat.label)}>
                Nuevo plan en {cat.label}
              </button>
            </div>
            {plans.length === 0 && <p className="hint">Todavía no hay planes en {cat.label}. Mientras no haya uno visible, la pestaña no aparece en la web.</p>}

            {plans.map((p) => (
              <Section key={p.id} title={`${p.name}${p.active ? "" : " · oculto"}`} hint={couplesWith(p.id)}>
                <div className="form-grid">
                  <TextField label="Nombre" value={p.name} onCommit={(v) => repo.updatePlan(p.id, { name: v })} />
                  <TextField
                    label="Inversión desde"
                    prefix="S/"
                    placeholder="Vacío = Consultar precio"
                    value={p.priceFrom > 0 ? String(p.priceFrom) : ""}
                    onCommit={(v) => repo.updatePlan(p.id, { priceFrom: toPrice(v) })}
                  />
                  <label className="field">
                    <span className="field__label">Categoría</span>
                    <select value={p.category} onChange={(e) => run(() => repo.updatePlan(p.id, { category: e.target.value as PlanCategory }))}>
                      {PLAN_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <TextField label="Descripción" value={p.description} multiline rows={2} onCommit={(v) => repo.updatePlan(p.id, { description: v })} />
                </div>
                <div className="form-grid form-grid--2">
                  <Toggle label="Mostrar en la web" checked={p.active} onChange={(v) => run(() => repo.updatePlan(p.id, { active: v }))} />
                  <Toggle label="Destacado" hint="Solo uno por pestaña" checked={p.featured} onChange={(v) => run(() => repo.updatePlan(p.id, { featured: v }))} />
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
          </div>
        );
      })}
    </>
  );
}
