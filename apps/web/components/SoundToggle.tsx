"use client";
// Activa o silencia el sonido de proyector del carrusel. Solo aparece en la home.
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

  return (
    <button className={`sound${on ? "" : " is-off"}`} aria-pressed={on} aria-label="Sonido" onClick={toggle}>
      <span className="sound__bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sound__label">{on ? "Sonido" : "Sin sonido"}</span>
    </button>
  );
}
