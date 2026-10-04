"use client";
// Editor de historia: 6 pasos en el orden en que se arma una historia.
// Datos → Archivos → Presentación → Galería pública → Agradecimientos → Acceso.
import Link from "next/link";
import { useEffect, useState } from "react";
import { completeness, type EditorStep } from "@bb/core";
import { webUrl } from "@/lib/asset";
import { useDb } from "@/lib/use-db";
import { useFlash } from "../ui";
import { StepAcceso } from "./StepAcceso";
import { StepAgradecimientos } from "./StepAgradecimientos";
import { StepArchivos } from "./StepArchivos";
import { StepDatos } from "./StepDatos";
import { StepGaleria } from "./StepGaleria";
import { StepPresentacion } from "./StepPresentacion";

const STEPS: { id: EditorStep; label: string }[] = [
  { id: "datos", label: "Datos" },
  { id: "archivos", label: "Archivos" },
  { id: "presentacion", label: "Presentación" },
  { id: "galeria", label: "Galería pública" },
  { id: "agradecimientos", label: "Agradecimientos" },
  { id: "acceso", label: "Acceso" },
];

export function StoryEditor() {
  const db = useDb();
  const [id, setId] = useState<string | null>(null);
  const [step, setStep] = useState<EditorStep>("datos");
  const [flash, toast] = useFlash();
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setId(q.get("id"));
    const paso = q.get("paso") as EditorStep | null;
    if (paso && STEPS.some((s) => s.id === paso)) setStep(paso);
  }, []);

  const go = (s: EditorStep) => {
    setStep(s);
    setShowChecklist(false);
    const q = new URLSearchParams(location.search);
    q.set("paso", s);
    history.replaceState(history.state, "", `${location.pathname}?${q}`);
    window.scrollTo({ top: 0 });
  };

  if (!db || id === null) return <p className="eyebrow">Cargando…</p>;
  const couple = db.couples.find((c) => c.id === id);
  if (!couple) {
    return (
      <div className="empty">
        <p>Esta historia no existe (o se eliminó).</p>
        <Link href="/parejas" className="btn btn--ghost">
          Volver a Parejas
        </Link>
      </div>
    );
  }
  const comp = completeness(db, couple.id);
  const pending = (s: EditorStep) => comp.items.some((i) => i.step === s && !i.ok);

  return (
    <div className="editor">
      <header className="editor__head">
        <div>
          <Link href="/parejas" className="eyebrow">
            ← Parejas
          </Link>
          <h1>{couple.names || "Nueva historia"}</h1>
        </div>
        <div className="editor__head-actions">
          <button type="button" className="progress-pill" onClick={() => setShowChecklist((v) => !v)} aria-expanded={showChecklist}>
            <span className="progress-pill__bar">
              <i style={{ width: `${(comp.done / comp.items.length) * 100}%` }} />
            </span>
            {comp.done}/{comp.items.length} listo
          </button>
          <a className="btn btn--ghost btn--sm" href={webUrl(`/portal?preview=${couple.id}`)} target="_blank" rel="noopener">
            Vista previa como la pareja
          </a>
        </div>
        {showChecklist && (
          <ul className="checklist">
            {comp.items.map((i) => (
              <li key={i.label} className={i.ok ? "is-ok" : ""}>
                <span aria-hidden="true">{i.ok ? "✓" : "○"}</span>
                {i.ok ? (
                  i.label
                ) : (
                  <button type="button" className="link-btn" onClick={() => go(i.step)}>
                    {i.label}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </header>

      <nav className="steps" aria-label="Pasos del editor">
        {STEPS.map((s, n) => (
          <button key={s.id} className={`steps__btn${step === s.id ? " is-on" : ""}`} onClick={() => go(s.id)} aria-current={step === s.id}>
            <span className="steps__num">{n + 1}</span>
            {s.label}
            {pending(s.id) && <span className="steps__dot" title="Le falta algo" />}
          </button>
        ))}
      </nav>

      <div className="editor__body">
        {step === "datos" && <StepDatos db={db} couple={couple} flash={flash} />}
        {step === "archivos" && <StepArchivos db={db} couple={couple} flash={flash} />}
        {step === "presentacion" && <StepPresentacion db={db} couple={couple} flash={flash} />}
        {step === "galeria" && <StepGaleria db={db} couple={couple} flash={flash} />}
        {step === "agradecimientos" && <StepAgradecimientos db={db} couple={couple} flash={flash} />}
        {step === "acceso" && <StepAcceso db={db} couple={couple} flash={flash} />}
      </div>

      <footer className="editor__foot">
        {STEPS.findIndex((s) => s.id === step) > 0 && (
          <button type="button" className="btn btn--ghost" onClick={() => go(STEPS[STEPS.findIndex((s) => s.id === step) - 1].id)}>
            ← Anterior
          </button>
        )}
        {STEPS.findIndex((s) => s.id === step) < STEPS.length - 1 && (
          <button type="button" className="btn btn--solid" onClick={() => go(STEPS[STEPS.findIndex((s) => s.id === step) + 1].id)}>
            Siguiente: {STEPS[STEPS.findIndex((s) => s.id === step) + 1].label} →
          </button>
        )}
      </footer>
      {toast}
    </div>
  );
}

export interface StepProps {
  db: import("@bb/core").Db;
  couple: import("@bb/core").Couple;
  flash: (msg: string) => void;
}
