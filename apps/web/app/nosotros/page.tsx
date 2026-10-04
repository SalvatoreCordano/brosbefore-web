import type { Metadata } from "next";
import { CtaBlock } from "@/components/CtaBlock";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Nosotros — (brosbefore)™" };

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
          {/* MOCK: reemplazar por foto de Carozzi & Zelmar */}
          <img className="about__img" src="https://picsum.photos/seed/bb-nosotros/900/1125" alt="Carozzi & Zelmar" />
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
