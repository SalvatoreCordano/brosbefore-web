import type { Metadata } from "next";
import { CtaBlock } from "@/components/CtaBlock";
import { Footer } from "@/components/Footer";
import { asset } from "@/lib/asset";

export const metadata: Metadata = { title: "Nosotros — (brosbefore)™" };

// TODO: biografías de ejemplo — reemplazar con el texto que escriba cada uno
const TEAM = [
  {
    name: "Zelmar Reyes",
    role: "Fotografía",
    instagram: "zelmarrw",
    photo: "assets/nosotros/zelmar.jpg",
    w: 1440,
    h: 1800,
    bio: "Busca lo que pasa entre una foto y otra: miradas, gestos y detalles que duran un segundo. Retratos honestos, sin poses forzadas.",
  },
  {
    name: "Carozzi Moreno",
    role: "Video y edición",
    instagram: "carozzi8",
    photo: "assets/nosotros/carozzi.jpg",
    w: 1080,
    h: 1440,
    bio: "Graba escenas atípicas y las compone en films que se sienten como la película de la pareja: con ritmo, música y emoción.",
  },
];

export default function Nosotros() {
  return (
    <>
      <main className="page">
        <span className="eyebrow">Nosotros</span>
        <h1 className="page__title">
          No es solo un día.
          <br />
          Es una historia.
        </h1>

        <section className="about">
          <img className="about__img" src={asset("assets/nosotros/equipo.webp")} alt="Carozzi y Zelmar, el equipo de brosbefore" width={1341} height={1985} style={{ objectPosition: "50% 90%" }} />
          <div>
            <p className="about__lead">
              Somos Carozzi &amp; Zelmar. Filmmakers y fotógrafos, pero antes que todo, amigos desde hace años.
            </p>
            <p>
              Por cosas del destino terminamos colaborando en bodas. Y ahí lo vimos claro: cubrir una boda no es sólo
              registrar lo que pasa. Es contar una historia. Tu historia.
            </p>
            <p>
              Nos dimos cuenta de que lo que más nos mueve es contar historias a través de momentos reales. Momentos
              que, con el tiempo, se convierten en memorias. Así nació BrosBefore™.
            </p>
            <p>
              Nuestro estilo es experimental. Hacemos fotografía y video. Usamos diferentes recursos y formatos —
              digital, analógico, mixed media — para compartir perspectivas únicas.
            </p>
            <p>
              Nos gusta grabar escenas atípicas, buscar detalles que otros podrían pasar por alto y luego componer tu
              historia. No hacemos sólo secuencias bonitas ni fotos posadas. Creamos retratos auténticos de quiénes son
              y de lo que aman.
            </p>
            <p>
              Trabajar contigo nos recarga. Ser parte de tu historia es un honor y juntos vamos a crear un recuerdo que
              dure toda la vida.
            </p>
          </div>
        </section>

        <section className="team" aria-labelledby="team-title">
          <span className="eyebrow" id="team-title">
            Nuestro equipo
          </span>
          <div className="team__grid">
            {TEAM.map((m) => (
              <article key={m.name} className="team__card">
                <img className="team__img" src={asset(m.photo)} alt={`Trabajo de ${m.name}`} width={m.w} height={m.h} loading="lazy" />
                <span className="eyebrow">{m.role}</span>
                <h2 className="team__name">{m.name}</h2>
                <p className="team__bio">{m.bio}</p>
                <a className="team__ig" href={`https://www.instagram.com/${m.instagram}/`} target="_blank" rel="noopener">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                  </svg>
                  @{m.instagram}
                </a>
              </article>
            ))}
          </div>
        </section>

        <p className="quote">
          En 30 años vas a querer volver a este día. Con tu familia. Con tus amigos. Con tus futuras generaciones.
        </p>

        <CtaBlock
          text="Mira las historias que hemos contado, o elige cómo quieres que contemos la tuya."
          links={[
            { href: "/galeria", label: "Ver galería" },
            { href: "/planes", label: "Ver planes" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
