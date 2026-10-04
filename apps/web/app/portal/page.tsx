import type { Metadata } from "next";
import { PortalApp } from "@/components/portal/PortalApp";

export const metadata: Metadata = { title: "Portal — (brosbefore)™", robots: { index: false } };

export default function PortalPage() {
  return <PortalApp />;
}
