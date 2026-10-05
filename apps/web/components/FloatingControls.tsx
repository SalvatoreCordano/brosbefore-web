"use client";
// Botón flotante con los ajustes de visualización: tema claro/oscuro y (en la home) sonido.
// Abajo a la derecha, por encima de los botones fijos de cada página para no taparlos;
// se oculta con el menú abierto y respeta el área segura de los celulares.
import { usePathname } from "next/navigation";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";

export function FloatingControls() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // en la home y en el portal hay un botón fijo abajo a la derecha (Ver galería / música)
  const raised = isHome || pathname.startsWith("/portal");
  return (
    <div className={`fab${raised ? " fab--raised" : ""}`} role="group" aria-label="Ajustes de visualización">
      {isHome && <SoundToggle />}
      <ThemeToggle />
    </div>
  );
}
