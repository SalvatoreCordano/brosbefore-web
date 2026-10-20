"use client";
// Pantalla de construcción del admin: el aspecto del loader con solo el logo, sin enlaces.
// Se entra a mano a /admin. Oculta, no protege: la protección real es Cloudflare Access + el login.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { ACCESS_KEY, UNDER_CONSTRUCTION } from "@/lib/construction";

function Soon() {
  const el = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const i = img.current;
    if (!i) return;
    const ready = () => el.current?.classList.add("is-ready");
    if (i.complete) ready();
    else {
      i.addEventListener("load", ready, { once: true });
      i.addEventListener("error", ready, { once: true });
    }
  }, []);
  return (
    <div className="soon" ref={el} role="main" aria-label="(brosbefore)™ — sitio en construcción">
      <img className="soon__img" ref={img} src={asset("assets/intro.webp")} alt="" fetchPriority="high" />
      <img className="soon__logo" src={asset("assets/logo.svg")} alt="(brosbefore)™" />
    </div>
  );
}

export function ConstructionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      setUnlocked(localStorage.getItem(ACCESS_KEY) === "1");
    } catch {}
  }, [pathname]);

  if (!UNDER_CONSTRUCTION || pathname === "/admin" || unlocked) return <>{children}</>;
  return <Soon />;
}
