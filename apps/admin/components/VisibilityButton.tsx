"use client";
// Ícono de ojo para mostrar/ocultar (en galería o en portafolio).
export function VisibilityButton({
  visible,
  onToggle,
  label,
  disabled,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string; // "galería" | "portafolio"
  disabled?: boolean;
}) {
  const text = visible ? `Ocultar de ${label}` : `Mostrar en ${label}`;
  return (
    <button
      type="button"
      className={`icon-btn${visible ? "" : " is-off"}`}
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={text}
      title={disabled ? `Primero hay que mostrarla en galería` : text}
      disabled={disabled}
    >
      {visible ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 3l18 18M10.6 5.1A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.5 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      )}
    </button>
  );
}
