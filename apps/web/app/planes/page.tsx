import type { Metadata } from "next";
import { CtaBlock } from "@/components/CtaBlock";
import { Footer } from "@/components/Footer";
import { Plans } from "@/components/Plans";

export const metadata: Metadata = { title: "Planes — (brosbefore)™" };

export default function Planes() {
  return (
    <>
      <main className="page">
        <span className="eyebrow">Colecciones</span>
        <h1 className="page__title">Un día que no se repite.</h1>

        <Plans />

        <p className="fineprint">No incluye movilidades. La entrega es a través de una galería online.</p>

        <p className="quote">Creemos en recuerdos que se vuelven más valiosos con el tiempo.</p>

        <CtaBlock
          text="Antes de elegir, conócenos y mira nuestro trabajo."
          links={[
            { href: "/nosotros", label: "Conócenos" },
            { href: "/galeria", label: "Ver galería" },
          ]}
        />
      </main>
      <Footer />
    </>
  );
}
