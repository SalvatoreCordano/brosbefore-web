"use client";
// Paso 5 — Agradecimientos: lo que la pareja escribió desde el portal.
// Repostear publica una versión editada en la ficha pública, firmada por la pareja.
import { useState } from "react";
import { repo, type Testimonial } from "@bb/core";
import { Section } from "../ui";
import type { StepProps } from "./StoryEditor";

export function StepAgradecimientos({ db, couple, flash }: StepProps) {
  const list = db.testimonials.filter((t) => t.coupleId === couple.id);
  return (
    <Section
      title="Agradecimientos"
      hint="La pareja los escribe desde su portal. Al repostear puedes mejorar la redacción; en la web sale firmado por la pareja."
    >
      {list.length === 0 ? (
        <div className="empty">
          <p>Todavía no hay agradecimientos. Aparecerán aquí cuando la pareja escriba desde su portal.</p>
        </div>
      ) : (
        list.map((t) => <TestimonialCard key={t.id} t={t} author={db.members.find((m) => m.id === t.memberId)} names={couple.names} flash={flash} />)
      )}
    </Section>
  );
}

function TestimonialCard({
  t,
  author,
  names,
  flash,
}: {
  t: Testimonial;
  author?: { name: string; email: string };
  names: string;
  flash: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(t.publishedText || t.originalText);
  const who = author?.name || author?.email || "Miembro de la pareja";

  return (
    <article className={`testi${t.reposted ? " is-reposted" : ""}`}>
      <div className="testi__head">
        <strong>{who}</strong>
        <span className="eyebrow">{new Date(t.updatedAt).toLocaleDateString("es-PE")}</span>
        {t.reposted ? <span className="badge badge--ok">Publicado en la ficha</span> : <span className="badge">Por revisar</span>}
      </div>

      {editing ? (
        <div className="testi__edit">
          <div>
            <span className="field__label">Original</span>
            <p className="testi__original">{t.originalText}</p>
          </div>
          <label className="field">
            <span className="field__label">Versión que se publica</span>
            <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <div className="testi__actions">
            <span className="hint">Firmado: — {names}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--solid btn--sm"
              onClick={async () => {
                await repo.repostTestimonial(t.id, text);
                setEditing(false);
                flash("Testimonio publicado en la ficha pública");
              }}
            >
              Publicar en la ficha
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="testi__text">“{t.reposted ? t.publishedText : t.originalText}”</p>
          {t.reposted && t.publishedText !== t.originalText && <p className="hint">Original: “{t.originalText}”</p>}
          <div className="testi__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
              {t.reposted ? "Editar versión publicada" : "Repostear"}
            </button>
            {t.reposted && (
              <button type="button" className="link-btn" onClick={() => repo.unrepostTestimonial(t.id)}>
                Quitar de la ficha
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
