"use client";
// Activa o silencia el sonido de proyector del carrusel. Solo aparece en la home (botón flotante).
import { useEffect, useState } from "react";
import { projectorSound } from "@/lib/projector-sound";

export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(projectorSound().enabled), []);

  const toggle = () => {
    const sound = projectorSound();
    sound.setEnabled(!sound.enabled);
    setOn(sound.enabled);
    if (sound.enabled) setTimeout(() => sound.play(), 30); // muestra del clack
  };

  const label = on ? "Silenciar el sonido del carrusel" : "Activar el sonido del carrusel";
  return (
    <button type="button" className={`fab__btn sound${on ? "" : " is-off"}`} aria-label={label} title={label} onClick={toggle}>
      <span className="sound__bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
}
