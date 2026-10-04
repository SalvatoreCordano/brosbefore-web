"use client";
// Paso 1 — Datos de la pareja: nombres, URL, plan, lugar, fecha y coberturas contratadas.
import { COVERAGE_LABEL, COVERAGE_ORDER, repo, type CoverageType } from "@bb/core";
import { Section, TextField } from "../ui";
import type { StepProps } from "./StoryEditor";

export function StepDatos({ db, couple, flash }: StepProps) {
  const coverages = db.coverages.filter((cv) => cv.coupleId === couple.id);
  const has = (t: CoverageType) => coverages.some((cv) => cv.type === t);
  const filesIn = (t: CoverageType) => {
    const cv = coverages.find((x) => x.type === t);
    const moments = new Set(db.moments.filter((m) => m.coverageId === cv?.id).map((m) => m.id));
    return db.files.filter((f) => moments.has(f.momentId)).length;
  };

  const toggleCoverage = async (t: CoverageType, on: boolean) => {
    const next = COVERAGE_ORDER.filter((x) => (x === t ? on : has(x)));
    if (!next.length) return flash("La historia necesita al menos una cobertura");
    const n = filesIn(t);
    if (!on && n && !confirm(`Quitar ${COVERAGE_LABEL[t]} borra sus ${n} archivos. ¿Continuar?`)) return;
    await repo.setCoverages(couple.id, next);
  };

  return (
    <>
      <Section title="La pareja">
        <div className="form-grid">
          <TextField label="Nombres" value={couple.names} placeholder="Ej. Ceziel & Gianfranco" onCommit={(v) => repo.updateCouple(couple.id, { names: v })} />
          <TextField label="URL pública" prefix="/galeria/" value={couple.slug} onCommit={(v) => repo.updateCouple(couple.id, { slug: v })} />
          <label className="field">
            <span className="field__label">Plan</span>
            <select value={couple.planId ?? ""} onChange={(e) => repo.updateCouple(couple.id, { planId: e.target.value || null })}>
              <option value="">Sin plan</option>
              {db.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="Lugar" value={couple.location} placeholder="Ej. Paracas, Perú" onCommit={(v) => repo.updateCouple(couple.id, { location: v })} />
          <TextField label="Fecha de la boda" value={couple.weddingDate} placeholder="Ej. 7 de agosto, 2024" onCommit={(v) => repo.updateCouple(couple.id, { weddingDate: v })} />
        </div>
      </Section>

      <Section title="Coberturas contratadas" hint="Mínimo una. Cada cobertura tiene sus propios archivos, fecha y lugar.">
        <div className="coverage-list">
          {COVERAGE_ORDER.slice()
            .reverse()
            .map((t) => {
              const cv = coverages.find((x) => x.type === t);
              return (
                <div key={t} className={`coverage-row${cv ? " is-on" : ""}`}>
                  <label className="check">
                    <input type="checkbox" checked={!!cv} onChange={(e) => toggleCoverage(t, e.target.checked)} />
                    <span>{COVERAGE_LABEL[t]}</span>
                  </label>
                  {cv && (
                    <div className="form-grid form-grid--2">
                      <TextField label="Fecha" value={cv.date} onCommit={(v) => repo.updateCoverage(cv.id, { date: v })} />
                      <TextField label="Lugar" value={cv.location} onCommit={(v) => repo.updateCoverage(cv.id, { location: v })} />
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Section>
    </>
  );
}
