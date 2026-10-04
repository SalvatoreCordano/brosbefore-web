"use client";
// Agradecimiento: cada miembro con acceso escribe y firma el suyo, y ve el de su pareja.
import { useState } from "react";
import { repo, type Db, type Session } from "@bb/core";

export function Thanks({ db, session }: { db: Db; session: Session }) {
  const mine = db.testimonials.find((t) => t.memberId === session.member.id);
  const [text, setText] = useState(mine?.originalText ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const others = db.members
    .filter((m) => m.coupleId === session.couple.id && m.id !== session.member.id && m.status !== "revoked")
    .map((m) => ({ member: m, t: db.testimonials.find((t) => t.memberId === m.id) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await repo.writeTestimonial(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    }
  };

  return (
    <main className="thanks">
      <span className="eyebrow">Agradecimiento</span>
      <h1>Unas palabras para brosbefore</h1>
      <p className="thanks__lead">
        Cuéntennos cómo vivieron su historia. Cada uno puede dejar el suyo, firmado con su nombre.
      </p>

      {mine?.reposted ? (
        <figure className="testimonial testimonial--card">
          <blockquote>“{mine.publishedText}”</blockquote>
          <figcaption className="eyebrow">— {session.member.name} · Publicado en su historia</figcaption>
        </figure>
      ) : (
        <form className="thanks__form" onSubmit={save}>
          <label className="field">
            <span className="field__label">Tu agradecimiento</span>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe aquí…" />
          </label>
          <div className="thanks__foot">
            <span className="eyebrow">Firmado por {session.member.name}</span>
            <button type="submit" className="btn btn--solid" disabled={!text.trim()}>
              {mine ? "Guardar cambios" : "Enviar agradecimiento"}
            </button>
          </div>
          {saved && <p className="form-ok">¡Gracias! Lo recibimos.</p>}
          {error && <p className="form-error">{error}</p>}
        </form>
      )}

      {others.map(({ member, t }) => (
        <figure key={member.id} className="testimonial testimonial--card is-muted">
          {t ? (
            <blockquote>“{t.reposted ? t.publishedText : t.originalText}”</blockquote>
          ) : (
            <blockquote className="eyebrow">{member.name || member.email} todavía no escribió el suyo.</blockquote>
          )}
          <figcaption className="eyebrow">— {member.name || member.email}</figcaption>
        </figure>
      ))}
    </main>
  );
}
