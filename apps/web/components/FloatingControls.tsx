"use client";
// Botón flotante de la home con los ajustes de visualización: sonido y tema claro/oscuro.
// A la mitad de la pantalla en el borde derecho; se oculta con el menú abierto
// y respeta el área segura de los celulares.
import { usePathname } from "next/navigation";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";

export function FloatingControls() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // fuera de la home el tema va en la barra de arriba (navbar o barra del portal)
  if (!isHome) return null;
  return (
    <div className="fab" role="group" aria-label="Ajustes de visualización">
      {isHome && <SoundToggle />}
      <ThemeToggle />
    </div>
  );
}
