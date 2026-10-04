"use client";
// Navbar compartido: logo + (sonido en la home) + tema + hamburguesa con menú desplegable.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import { SITE } from "@/lib/site";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/planes", label: "Planes" },
];

export function Nav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const setMenu = useCallback((v: boolean) => {
    setOpen(v);
    document.body.classList.toggle("menu-open", v);
  }, []);

  // cerrar el menú al cambiar de página o con Escape
  useEffect(() => setMenu(false), [pathname, setMenu]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setMenu]);

  // navbar sólido al hacer scroll: escucha la página y paneles con scroll propio (detalle en home)
  useEffect(() => {
    const panels = [...document.querySelectorAll<HTMLElement>("[data-nav-scroll]")];
    const onScroll = () => setScrolled(Math.max(window.scrollY, ...panels.map((el) => el.scrollTop)) > 8);
    const targets: (Window | HTMLElement)[] = [window, ...panels];
    targets.forEach((t) => t.addEventListener("scroll", onScroll, { passive: true }));
    onScroll();
    return () => targets.forEach((t) => t.removeEventListener("scroll", onScroll));
  }, [pathname]);

  return (
    <>
      <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
        <Link className="nav__logo" href="/" aria-label="brosbefore — inicio">
          <img src={asset("assets/logo.svg")} alt={SITE.name} />
        </Link>
        <div className="nav__actions">
          {isHome && <SoundToggle />}
          <ThemeToggle />
          <button
            className="nav__burger"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="menu"
            onClick={() => setMenu(!open)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="menu" id="menu" aria-hidden={!open}>
        <nav className="menu__links">
          {LINKS.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`menu__link${pathname === l.href ? " is-current" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => setMenu(false)}
            >
              <span className="menu__num">0{i + 1}</span>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="menu__foot" style={{ "--i": 3 } as React.CSSProperties}>
          <button type="button" className="btn btn--solid menu__cta">
            Contáctanos
          </button>
          <a className="btn btn--ghost" href={SITE.instagram} target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
            </svg>
            Instagram
          </a>
        </div>
      </div>
    </>
  );
}
