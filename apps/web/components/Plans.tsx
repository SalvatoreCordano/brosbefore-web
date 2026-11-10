"use client";
// Planes por pestaña (Wedding, Dates, Proposal), como el selector mensual/anual de un pago.
// El HTML publicado trae los planes iniciales (seed); al cargar se reemplazan por los reales.
import { useEffect, useRef, useState } from "react";
import { seedPlans, toPlanGroups, type PlanCategory } from "@bb/core";
import { useDb } from "@/lib/use-db";

const price = (n: number) => `S/ ${n.toLocaleString("en-US")}`;

export function Plans() {
  const db = useDb();
  const groups = toPlanGroups(db ? db.plans : seedPlans);
  // pestaña pedida en la dirección (/planes?tipo=dates): permite compartir el enlace a una familia
  const [wanted, setWanted] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => setWanted(new URLSearchParams(location.search).get("tipo")), []);

  if (!groups.length) return <p className="plan__desc">Escríbenos y te contamos qué planes tenemos disponibles.</p>;
  const index = Math.max(0, groups.findIndex((g) => g.id === wanted));
  const group = groups[index];

  const select = (i: number) => {
    const id: PlanCategory = groups[i].id;
    setWanted(id);
    history.replaceState(history.state, "", i === 0 ? location.pathname : `${location.pathname}?tipo=${id}`);
    tabs.current[i]?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: groups.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((next + groups.length) % groups.length);
  };

  return (
    <>
      {groups.length > 1 && (
        <div className="plan-switch" role="tablist" aria-label="Tipo de plan" style={{ "--n": groups.length, "--i": index } as React.CSSProperties} onKeyDown={onKey}>
          <span className="plan-switch__thumb" aria-hidden="true" />
          {groups.map((g, i) => (
            <button
              key={g.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`plan-tab-${g.id}`}
              aria-selected={i === index}
              aria-controls="plan-panel"
              tabIndex={i === index ? 0 : -1}
              className="plan-switch__tab"
              onClick={() => select(i)}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      <section
        key={group.id}
        id="plan-panel"
        role={groups.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={groups.length > 1 ? `plan-tab-${group.id}` : undefined}
        className="plans"
        style={{ "--cols": Math.min(group.plans.length, 3) } as React.CSSProperties}
      >
        {group.plans.map((p) => (
          <article key={p.id} className={`plan${p.featured ? " plan--featured" : ""}`}>
            <div>
              <span className="eyebrow">{p.num}</span>
              <h2 className="plan__name">{p.name}</h2>
              <p className="plan__desc">{p.description}</p>
            </div>
            <div className="plan__price">
              {p.priceFrom > 0 ? (
                <>
                  Inversión desde<strong>{price(p.priceFrom)}</strong>
                </>
              ) : (
                <strong>Consultar precio</strong>
              )}
            </div>
            <dl>
              {p.rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>
                    {r.lines.map((l, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {l}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <a
              className={`btn ${p.featured ? "btn--solid" : "btn--ghost"}`}
              href={`https://wa.me/@carozzi8?text=${encodeURIComponent(`¡Hola! Quisiera consultar fecha para el plan ${p.name} (${group.label}).`)}`}
              target="_blank"
              rel="noopener"
            >
              Consultar fecha
            </a>
          </article>
        ))}
      </section>
    </>
  );
}
