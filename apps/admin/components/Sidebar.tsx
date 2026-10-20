"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { repo } from "@bb/core";
import { asset, webUrl } from "@/lib/asset";
import { UNDER_CONSTRUCTION } from "@/lib/construction";

const NAV = [
  { href: "/", label: "Métricas" },
  { href: "/parejas", label: "Parejas", also: ["/historia"] },
  { href: "/portafolio", label: "Portafolio" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    repo.getAdmin().then((a) => setAdminEmail(a?.email ?? ""));
  }, []);
  const isMock = repo.mode === "mock";
  const reset = async () => {
    if (!confirm("¿Volver a los datos de ejemplo? Se pierden los cambios y archivos de esta demo.")) return;
    await repo.resetDemo();
  };

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar__logo" aria-label="Admin — inicio">
        <img src={asset("assets/logo.svg")} alt="(brosbefore)™" />
        <span className="eyebrow">Admin</span>
      </Link>
      <nav className="sidebar__nav">
        {NAV.map((n) => {
          const on = pathname === n.href || n.also?.some((p) => pathname.startsWith(p));
          return (
            <Link key={n.href} href={n.href} className={`sidebar__link${on ? " is-current" : ""}`}>
              {n.label}
            </Link>
          );
        })}
        <a className="sidebar__link" href={webUrl(UNDER_CONSTRUCTION ? "/web" : "/")} target="_blank" rel="noopener">
          Ver sitio ↗
        </a>
      </nav>
      <div className="sidebar__foot">
        {isMock && (
          <>
            <span className="badge">Demo · datos de ejemplo</span>
            <button type="button" className="link-btn" onClick={reset}>
              Restablecer demo
            </button>
          </>
        )}
        <div className="sidebar__user">
          <span className="avatar">{isMock ? "CZ" : (adminEmail[0] ?? "A").toUpperCase()}</span>
          <span>{isMock ? "Carozzi & Zelmar" : adminEmail}</span>
        </div>
        {!isMock && (
          <button type="button" className="link-btn" onClick={() => repo.adminLogout()}>
            Salir
          </button>
        )}
      </div>
    </aside>
  );
}
