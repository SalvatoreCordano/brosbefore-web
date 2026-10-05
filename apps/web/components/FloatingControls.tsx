"use client";
// Botón flotante con los ajustes de visualización: tema claro/oscuro y (en la home) sonido.
// A la mitad de la pantalla en el borde derecho; se oculta con el menú abierto
// y respeta el área segura de los celulares.
import { usePathname } from "next/navigation";
import { SoundToggle } from "./SoundToggle";
import { ThemeToggle } from "./ThemeToggle";

export function FloatingControls() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <div className="fab" role="group" aria-label="Ajustes de visualización">
      {isHome && <SoundToggle />}
      <ThemeToggle />
    </div>
  );
}
