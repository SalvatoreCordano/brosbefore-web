"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { repo } from "@bb/core";
import { asset } from "@/lib/asset";

const NAV = [
  { href: "/", label: "Métricas" },
  { href: "/parejas", label: "Parejas" },
  { href: "/portafolio", label: "Portafolio" },
];

export function Sidebar() {
  const pathname = usePathname();
  const reset = async () => {
    if (!confirm("¿Volver a los datos de ejemplo? Se pierden los cambios hechos en esta demo.")) return;
    await repo.resetDemo();
  };

  return (
    <aside className="sidebar">
      <Link href="/" className="sidebar__logo" aria-label="Admin — inicio">
        <img src={asset("assets/logo.svg")} alt="(brosbefore)™" />
        <span className="eyebrow">Admin</span>
      </Link>
      <nav className="sidebar__nav">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`sidebar__link${pathname === n.href ? " is-current" : ""}`}>
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar__foot">
        <span className="badge">Demo · datos de ejemplo</span>
        <button type="button" className="link-btn" onClick={reset}>
          Restablecer demo
        </button>
        <div className="sidebar__user">
          <span className="avatar">CZ</span>
          <span>Carozzi &amp; Zelmar</span>
        </div>
      </div>
    </aside>
  );
}
