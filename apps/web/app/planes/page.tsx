import type { Metadata } from "next";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Planes — (brosbefore)™" };

// Contenido fijo por ahora; cuando exista la sección Planes del admin (P1) saldrá de los datos.
const PLANS = [
  {
    num: "01",
    name: "essentials™",
    desc: "Lo esencial para recordar su día tal como fue.",
    price: "S/ 4,500",
    featured: false,
    rows: [
      ["Cobertura", ["El día de la boda, hasta 6 horas de cobertura continua"]],
      ["Crew", ["1 fotógrafo principal y 1 filmmaker"]],
      ["Entregables", ["Galería online personalizada (+300 fotos)", "Un highlight film (2:30 a 3 min)"]],
      ["Entrega", ["4 a 6 semanas después de la boda"]],
    ],
  },
  {
    num: "02",
    name: "the story™",
    desc: "Para quienes quieren verse, sentirse y reconocerse en su historia.",
    price: "S/ 8,000",
    featured: true,
    rows: [
      ["Cobertura", ["2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 8 hrs)"]],
      ["Crew", ["1 fotógrafo principal y 1 filmmaker"]],
      [
        "Entregables",
        [
          "Galería online personalizada (+500 fotos), algunas análogas (cámara a rollo)",
          "Un story film (3 a 4:30 min)",
          "Un wedding reel (en 24 hrs / 30 s)",
        ],
      ],
      ["Entrega", ["4 a 6 semanas después de la boda"]],
    ],
  },
  {
    num: "03",
    name: "the legacy™",
    desc: "Para quienes entienden que este recuerdo no es solo para hoy.",
    price: "S/ 12,000",
    featured: false,
    rows: [
      ["Cobertura", ["2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 12 hrs)"]],
      ["Crew", ["2 fotógrafos y 2 filmmakers"]],
      [
        "Entregables",
        [
          "Galería online personalizada (+800 fotos)",
          "Galería análoga (+150 fotos en 35mm y 120mm)",
          "Un legacy film (7 a 10 min)",
          "Un wedding reel (en 24 hrs / 1 min)",
          "Un dump de video (carrusel IG / 24 hrs / 5 videos colorizados)",
        ],
      ],
      ["Entrega", ["6 a 8 semanas después de la boda"]],
    ],
  },
] as const;

export default function Planes() {
  return (
    <>
      <main className="page">
        <span className="eyebrow">Colecciones</span>
        <h1 className="page__title">Un día que no se repite.</h1>

        <section className="plans">
          {PLANS.map((p) => (
            <article key={p.name} className={`plan${p.featured ? " plan--featured" : ""}`}>
              <div>
                <span className="eyebrow">{p.num}</span>
                <h2 className="plan__name">{p.name}</h2>
                <p className="plan__desc">{p.desc}</p>
              </div>
              <div className="plan__price">
                Inversión desde<strong>{p.price}</strong>
              </div>
              <dl>
                {p.rows.map(([label, lines]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      {lines.map((l, i) => (
                        <span key={i}>
                          {i > 0 && <br />}
                          {l}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
              <button type="button" className={`btn ${p.featured ? "btn--solid" : "btn--ghost"}`}>
                Consultar fecha
              </button>
            </article>
          ))}
        </section>

        <p className="fineprint">No incluye movilidades. La entrega es a través de una galería online.</p>

        <p className="quote">Creemos en recuerdos que se vuelven más valiosos con el tiempo.</p>
      </main>
      <Footer />
    </>
  );
}
