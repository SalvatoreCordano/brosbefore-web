import type { Metadata } from "next";
import { Register } from "@/components/portal/Auth";

export const metadata: Metadata = { title: "Crear cuenta — Portal (brosbefore)™", robots: { index: false } };

export default function Page() {
  return <Register />;
}
