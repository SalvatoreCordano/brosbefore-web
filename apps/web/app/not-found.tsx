"use client";
// 404. En el sitio estático, las fichas de parejas creadas en la demo no existen como archivo:
// GitHub Pages sirve esta página y aquí se arma la ficha leyendo los datos del navegador.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PublicProfile } from "@/components/PublicProfile";
import { BASE_PATH } from "@/lib/asset";

export default function NotFound() {
  const pathname = usePathname() ?? "";
  const path = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
  const match = path.match(/^\/galeria\/([^/]+)\/?$/);
  if (match) return <PublicProfile slug={decodeURIComponent(match[1])} />;
  return (
    <main className="page">
      <span className="eyebrow">404</span>
      <h1 className="page__title">Esta página no existe.</h1>
      <Link href="/" className="btn btn--ghost">
        Volver al inicio
      </Link>
    </main>
  );
}
