"use client";
// Tarjetas de planes. El HTML publicado trae los planes iniciales (seed); al cargar se reemplazan por los reales.
import { seedPlans, toPublicPlans } from "@bb/core";
import { useDb } from "@/lib/use-db";

const price = (n: number) => `S/ ${n.toLocaleString("en-US")}`;

export function Plans() {
  const db = useDb();
  const plans = toPublicPlans(db ? db.plans : seedPlans);
  if (!plans.length) return <p className="plan__desc">Escríbenos y te contamos qué planes tenemos disponibles.</p>;
  return (
    <section className="plans">
      {plans.map((p) => (
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
            href={`https://wa.me/@carozzi8?text=${encodeURIComponent(`¡Hola! Quisiera consultar fecha para el plan ${p.name}.`)}`}
            target="_blank"
            rel="noopener"
          >
            Consultar fecha
          </a>
        </article>
      ))}
    </section>
  );
}
