"use client";
// /pricing pasó a llamarse /planes: redirige a los links viejos.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PricingRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/planes"), [router]);
  return (
    <main className="page">
      <p className="eyebrow">
        Esta página ahora se llama <Link href="/planes">Planes</Link>.
      </p>
    </main>
  );
}
