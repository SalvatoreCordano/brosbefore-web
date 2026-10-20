"use client";
// Con datos reales el admin pide iniciar sesión; solo entra una cuenta de la tabla `admins`.
// (Cloudflare Access protege la página; esto protege los datos, que Supabase sirve directo.)
import { useEffect, useState } from "react";
import { repo } from "@bb/core";
import { asset } from "@/lib/asset";

type State = "loading" | "in" | "out";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const check = () => repo.getAdmin().then((a) => setState(a ? "in" : "out"));
    check();
    return repo.subscribe(check);
  }, []);

  if (state === "in") return <>{children}</>;
  if (state === "loading") return <p className="eyebrow gate__loading">Cargando…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await repo.adminLogin(email, password);
      setState("in");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    }
    setBusy(false);
  };

  return (
    <main className="gate">
      <form className="gate__card" onSubmit={submit}>
        <img className="gate__logo" src={asset("assets/logo-admin.svg")} alt="(brosbefore)™ admin" />
        <label className="field">
          <span className="field__label">Correo</span>
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">Contraseña</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--solid" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
