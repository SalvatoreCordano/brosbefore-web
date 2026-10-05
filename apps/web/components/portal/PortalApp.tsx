"use client";
// Portal de la pareja: Presentación · Archivos · Agradecimiento.
// Con ?preview={id} muestra el borrador de una historia (vista previa desde el admin).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { repo, toDownloads, toPresentation, type Session } from "@bb/core";
import { asset, BASE_PATH } from "@/lib/asset";
import { resolve } from "@/lib/resolve";
import { useDb } from "@/lib/use-db";
import { ThemeToggle } from "../ThemeToggle";
import { Downloads } from "./Downloads";
import { PresentationView } from "./PresentationView";
import { Thanks } from "./Thanks";

type Tab = "presentacion" | "archivos" | "agradecimiento";
const TABS: { id: Tab; label: string }[] = [
  { id: "presentacion", label: "Presentación" },
  { id: "archivos", label: "Archivos" },
  { id: "agradecimiento", label: "Agradecimiento" },
];

export function PortalApp() {
  const router = useRouter();
  const db = useDb();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("presentacion");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setPreview(new URLSearchParams(location.search).get("preview"));
    const fromHash = location.hash.slice(1) as Tab;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
    const load = () => repo.getSession().then(setSession);
    load();
    return repo.subscribe(load);
  }, []);

  // sin sesión (y sin vista previa) → login
  useEffect(() => {
    if (preview === null && session === null) router.replace("/portal/login");
  }, [preview, session, router]);

  const coupleId = preview ?? session?.couple.id ?? null;
  const couple = db?.couples.find((c) => c.id === coupleId) ?? null;
  const presentation = useMemo(
    () => (db && coupleId ? toPresentation(db, coupleId, preview ? "draft" : "published", resolve) : null),
    [db, coupleId, preview]
  );
  const downloads = useMemo(() => (db && coupleId ? toDownloads(db, coupleId, resolve) : null), [db, coupleId]);

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${t}`);
    window.scrollTo({ top: 0 });
  };

  const share = async () => {
    if (!couple) return;
    const url = `${location.origin}${BASE_PATH}/galeria/${couple.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: `${couple.names} — (brosbefore)™`, url });
      else {
        await navigator.clipboard.writeText(url);
        flash("Enlace de su historia copiado");
      }
    } catch {
      // el usuario cerró el menú de compartir
    }
  };
  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  };
  const logout = async () => {
    await repo.logout();
    router.replace("/portal/login");
  };

  if (!db || preview === undefined || (session === undefined && !preview)) {
    return <div className="portal-loading eyebrow">Cargando…</div>;
  }
  if (!couple) {
    return (
      <div className="portal-loading">
        <p className="eyebrow">{preview ? "Esa historia no existe." : "Redirigiendo…"}</p>
      </div>
    );
  }

  const suspended = couple.portalStatus === "suspended" && !preview;

  return (
    <div className="portal">
      {preview && (
        <div className="preview-bar">
          Vista previa del borrador — así lo verá la pareja cuando publiques.
          <button type="button" onClick={() => window.close()} className="link-btn">
            Cerrar
          </button>
        </div>
      )}

      <header className="portal__bar">
        <Link href="/" className="portal__logo" aria-label="brosbefore">
          <img src={asset("assets/logo.svg")} alt="(brosbefore)™" />
        </Link>
        {!suspended && (
          <nav className="portal__tabs" aria-label="Secciones del portal">
            {TABS.filter((t) => !(preview && t.id === "agradecimiento")).map((t) => (
              <button key={t.id} className={`portal__tab${tab === t.id ? " is-on" : ""}`} onClick={() => go(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
        )}
        <div className="portal__actions">
          <ThemeToggle />
          {!suspended && couple.inGallery && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={share}>
              Compartir
            </button>
          )}
          {session && (
            <button type="button" className="portal__logout" onClick={logout}>
              Cerrar sesión
            </button>
          )}
        </div>
      </header>

      {suspended ? (
        <main className="portal__state">
          <span className="eyebrow">{couple.names}</span>
          <h1>Presentación suspendida</h1>
          <p>Tu presentación no está disponible en este momento. Escríbenos y lo resolvemos.</p>
          <a className="btn btn--solid" href="mailto:hola@brosbefore.pe">
            Escribir a brosbefore
          </a>
        </main>
      ) : tab === "presentacion" ? (
        presentation ? (
          <PresentationView view={presentation} key={coupleId} />
        ) : (
          <main className="portal__state">
            <span className="eyebrow">{couple.names}</span>
            <h1>Su historia se está preparando.</h1>
            <p>Les avisaremos por correo apenas esté lista. Mientras tanto, pueden ver sus archivos.</p>
            <button type="button" className="btn btn--ghost" onClick={() => go("archivos")}>
              Ver archivos
            </button>
          </main>
        )
      ) : tab === "archivos" ? (
        <Downloads view={downloads!} names={couple.names} />
      ) : (
        session && db && <Thanks db={db} session={session} />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
