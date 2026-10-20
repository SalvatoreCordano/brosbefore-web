"use client";
// Pantalla de construcción: el aspecto del loader con solo el logo al centro, sin enlaces.
// Se sale entrando a mano a /web (todo el sitio) o a /portal (solo el portal de clientes).
// Esto oculta la web, no la protege: quien conozca la ruta entra.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import { ACCESS_KEY, UNDER_CONSTRUCTION } from "@/lib/construction";
import { SITE } from "@/lib/site";

const isOpen = (path: string) => path === "/web" || path === "/portal" || path.startsWith("/portal/");

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
    <div className="soon" ref={el} role="main" aria-label={`${SITE.name} — sitio en construcción`}>
      <img className="soon__img" ref={img} src={asset("assets/intro.webp")} alt="" fetchPriority="high" />
      <img className="soon__logo" src={asset("assets/logo.svg")} alt={SITE.name} />
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

  if (!UNDER_CONSTRUCTION || isOpen(pathname) || unlocked) return <>{children}</>;
  return <Soon />;
}
