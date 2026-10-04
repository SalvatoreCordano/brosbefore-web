import type { Metadata } from "next";
import { Recover } from "@/components/portal/Auth";

export const metadata: Metadata = { title: "Recuperar contraseña — Portal (brosbefore)™", robots: { index: false } };

export default function Page() {
  return <Recover />;
}
