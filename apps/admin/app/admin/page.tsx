"use client";
// Entrada manual al admin mientras está en construcción: deja la marca de acceso y va al inicio.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ACCESS_KEY } from "@/lib/construction";

export default function Enter() {
  const router = useRouter();
  useEffect(() => {
    try {
      localStorage.setItem(ACCESS_KEY, "1");
    } catch {}
    router.replace("/");
  }, [router]);
  return null;
}
