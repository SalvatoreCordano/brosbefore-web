import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Gallery } from "@/components/Gallery";

export const metadata: Metadata = { title: "Galería — (brosbefore)™" };

export default function GaleriaPage() {
  return (
    <>
      <Gallery />
      <Footer />
    </>
  );
}
