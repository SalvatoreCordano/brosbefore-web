"use client";
// Acceso al portal: login, registro desde la invitación y recuperar contraseña.
// El registro solo existe a partir de una invitación enviada desde el admin.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_ACCOUNTS, isEmail, repo } from "@bb/core";
import { asset } from "@/lib/asset";

function AuthCard({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <main className="auth">
      <div className="auth__card">
        <Link href="/" className="auth__logo" aria-label="brosbefore — inicio">
          <img src={asset("assets/logo.svg")} alt="(brosbefore)™" />
        </Link>
        <span className="eyebrow">Portal de clientes</span>
        <h1>{title}</h1>
        {lead && <p className="auth__lead">{lead}</p>}
        {children}
      </div>
    </main>
  );
}

export function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // con sesión abierta, directo al portal
  useEffect(() => {
    repo.getSession().then((s) => s && router.replace("/portal"));
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await repo.login(email, password);
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Entrar" lead="El acceso es solo por invitación de brosbefore. Si recibiste el correo, usa el enlace para crear tu cuenta.">
      <form className="auth__form" onSubmit={submit}>
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
        <Link href="/portal/recuperar" className="link-btn auth__alt">
          Olvidé mi contraseña
        </Link>
      </form>

      <div className="demo-box">
        <span className="eyebrow">Cuentas de la demo</span>
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            className="demo-box__btn"
            onClick={() => {
              setEmail(a.email);
              setPassword(a.password);
            }}
          >
            <strong>{a.couple}</strong>
            <span>{a.email}</span>
          </button>
        ))}
      </div>
    </AuthCard>
  );
}

export function Register() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; names: string } | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(location.search).get("token");
    setToken(t);
    if (!t) return setInvite(null);
    repo.getInvite(t).then(setInvite);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    try {
      await repo.registerWithInvite(token!, name, password);
      router.replace("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    }
  };

  if (invite === undefined) return <AuthCard title="Un momento…" />;
  if (invite === null) {
    return (
      <AuthCard
        title="Invitación no válida"
        lead="El enlace venció, ya se usó o fue revocado. Escríbele a brosbefore para que te envíe una nueva invitación."
      >
        <Link href="/portal/login" className="btn btn--ghost">
          Ir a entrar
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Bienvenidos, ${invite.names}`} lead="Crea tu cuenta para ver su historia. Solo te pedimos tu nombre y una contraseña.">
      <form className="auth__form" onSubmit={submit}>
        <label className="field">
          <span className="field__label">Correo</span>
          <input type="email" value={invite.email} readOnly disabled />
        </label>
        <label className="field">
          <span className="field__label">Tu nombre</span>
          <input autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">Contraseña (mínimo 8 caracteres)</span>
          <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">Repite la contraseña</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--solid">
          Crear cuenta y entrar
        </button>
      </form>
    </AuthCard>
  );
}

export function Recover() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <AuthCard title="Recuperar contraseña" lead="Te enviaremos un enlace para crear una contraseña nueva.">
      {sent ? (
        <>
          <p className="form-ok">
            Si {email} tiene una cuenta, le llegará el enlace en unos minutos. (En la demo no se envían correos.)
          </p>
          <Link href="/portal/login" className="btn btn--ghost">
            Volver a entrar
          </Link>
        </>
      ) : (
        <form
          className="auth__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (isEmail(email)) setSent(true);
          }}
        >
          <label className="field">
            <span className="field__label">Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn--solid">
            Enviar enlace
          </button>
          <Link href="/portal/login" className="link-btn auth__alt">
            Volver
          </Link>
        </form>
      )}
    </AuthCard>
  );
}
