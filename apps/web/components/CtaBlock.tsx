import Link from "next/link";

/** Bloque de cierre con dos llamados a la acción. */
export function CtaBlock({ text, links }: { text: string; links: { href: string; label: string }[] }) {
  return (
    <section className="cta-block">
      <p className="cta-block__text">{text}</p>
      <div className="cta-block__actions">
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} className={`btn ${i === 0 ? "btn--solid" : "btn--ghost"}`}>
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
