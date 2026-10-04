"use client";
// Piezas de UI del admin.
import { useEffect, useState } from "react";
import type { MediaFile } from "@bb/core";
import { resolve } from "@/lib/asset";

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle${disabled ? " is-disabled" : ""}`}>
      <span className="toggle__text">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}

export function Section({
  title,
  hint,
  children,
  actions,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="section">
      <div className="section__head">
        <div>
          <h2>{title}</h2>
          {hint && <p className="hint">{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Campo de texto que guarda al salir del campo (o con Enter en los de una línea). */
export function TextField({
  label,
  value,
  onCommit,
  multiline,
  placeholder,
  prefix,
  rows = 4,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => Promise<unknown> | void;
  multiline?: boolean;
  placeholder?: string;
  prefix?: string;
  rows?: number;
}) {
  const [v, setV] = useState(value);
  const [error, setError] = useState("");
  useEffect(() => setV(value), [value]);
  const commit = async () => {
    if (v === value) return;
    setError("");
    try {
      await onCommit(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setV(value);
    }
  };
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {multiline ? (
        <textarea rows={rows} value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={commit} />
      ) : (
        <span className={prefix ? "field__affix" : undefined}>
          {prefix && <span className="field__prefix">{prefix}</span>}
          <input
            value={v}
            placeholder={placeholder}
            onChange={(e) => setV(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </span>
      )}
      {error && <span className="form-error">{error}</span>}
    </label>
  );
}

export function Thumb({ file, className = "thumb" }: { file: MediaFile; className?: string }) {
  const src = file.storageKey ? resolve(file.storageKey) : "";
  const poster = file.poster ? resolve(file.poster) : "";
  return (
    <span className={className}>
      {file.kind === "photo" ? (
        src ? <img src={src} alt="" loading="lazy" /> : null
      ) : poster ? (
        <img src={poster} alt="" loading="lazy" />
      ) : src ? (
        <video src={`${src}#t=0.5`} muted playsInline preload="metadata" />
      ) : null}
      {file.kind === "video" && <span className="thumb__badge">Video</span>}
    </span>
  );
}

/** Grilla para elegir archivos (uno o varios). */
export function MediaPicker({
  files,
  selected,
  onChange,
  multiple = true,
  empty = "No hay archivos para elegir.",
}: {
  files: MediaFile[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  empty?: string;
}) {
  if (!files.length) return <p className="hint">{empty}</p>;
  const set = new Set(selected);
  const toggle = (id: string) => {
    if (!multiple) return onChange(set.has(id) ? [] : [id]);
    // conserva el orden de los archivos
    const next = set.has(id) ? selected.filter((x) => x !== id) : files.filter((f) => set.has(f.id) || f.id === id).map((f) => f.id);
    onChange(next);
  };
  return (
    <ul className="picker">
      {files.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            className={`picker__item${set.has(f.id) ? " is-on" : ""}`}
            aria-pressed={set.has(f.id)}
            title={f.name}
            onClick={() => toggle(f.id)}
          >
            <Thumb file={f} />
            <span className="picker__check" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 6.5l2.2 2.2 4.8-5.2" />
              </svg>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SelectAll({ files, selected, onChange }: { files: MediaFile[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (!files.length) return null;
  const all = selected.length === files.length;
  return (
    <button type="button" className="link-btn" onClick={() => onChange(all ? [] : files.map((f) => f.id))}>
      {all ? "Quitar todas" : "Elegir todas"}
    </button>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function useFlash() {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  };
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null;
  return [flash, node] as const;
}
