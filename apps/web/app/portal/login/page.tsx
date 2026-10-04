import type { Metadata } from "next";
import { Login } from "@/components/portal/Auth";

export const metadata: Metadata = { title: "Entrar — Portal (brosbefore)™", robots: { index: false } };

export default function Page() {
  return <Login />;
}
