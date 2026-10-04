"use client";
// Paso 6 — Acceso y configuración: correos de la pareja e invitaciones, visibilidad,
// suspender el portal y eliminar la historia.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { repo, type InviteLink, type Member, type MemberStatus } from "@bb/core";
import { webUrl } from "@/lib/asset";
import { Modal, Section, Toggle } from "../ui";
import type { StepProps } from "./StoryEditor";

const STATUS: Record<MemberStatus, string> = {
  saved: "Sin invitar",
  invited: "Invitación enviada",
  active: "Cuenta activa",
  expired: "Invitación vencida",
  revoked: "Acceso revocado",
};

export function StepAcceso({ db, couple, flash }: StepProps) {
  const router = useRouter();
  const members = db.members.filter((m) => m.coupleId === couple.id);
  const pres = db.presentations.find((p) => p.coupleId === couple.id);
  const [drafts, setDrafts] = useState<string[]>(members.length ? [] : [""]);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [deleting, setDeleting] = useState(false);
  const toInvite = members.filter((m) => m.status === "saved" || m.status === "expired").length;

  const send = async () => {
    if (!pres?.publishedAt && !confirm("La presentación todavía no se publicó: la pareja entraría y vería “Su historia se está preparando”. ¿Enviar igual?")) return;
    const sent = await repo.sendInvites(couple.id);
    setLinks(sent);
    flash(`${sent.length} invitaciones enviadas`);
  };

  return (
    <>
      <Section
        title="Correos de la pareja"
        hint="Uno, dos o más. Cada correo recibe su invitación para crear su cuenta (nombre y contraseña) y ver solo esta historia."
      >
        <ul className="members">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} coupleId={couple.id} flash={flash} onLink={(l) => setLinks([l])} />
          ))}
          {drafts.map((d, i) => (
            <DraftRow
              key={`draft-${i}`}
              value={d}
              onChange={(v) => setDrafts((x) => x.map((y, j) => (j === i ? v : y)))}
              onSave={async (v) => {
                await repo.saveMember(couple.id, v);
                setDrafts((x) => x.filter((_, j) => j !== i));
              }}
              onRemove={() => setDrafts((x) => x.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
        <div className="members__foot">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDrafts((x) => [...x, ""])}>
            + Agregar correo
          </button>
          <button type="button" className="btn btn--solid" disabled={!toInvite} onClick={send}>
            Enviar invitaciones{toInvite ? ` (${toInvite})` : ""}
          </button>
        </div>

        {links.length > 0 && (
          <div className="invite-links">
            <strong>En la demo no se envían correos.</strong>
            <span className="hint">Este es el enlace que recibiría cada persona: ábrelo para simular el registro.</span>
            {links.map((l) => {
              const url = `${location.origin}${webUrl(`/portal/registro?token=${l.token}`)}`;
              return (
                <div key={l.token} className="invite-links__row">
                  <span>{l.email}</span>
                  <a className="btn btn--ghost btn--sm" href={url} target="_blank" rel="noopener">
                    Abrir registro
                  </a>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => navigator.clipboard.writeText(url).then(() => flash("Enlace copiado"))}
                  >
                    Copiar enlace
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Visibilidad y portal">
        <div className="toggles">
          <Toggle
            checked={couple.inGallery}
            onChange={(v) => repo.setCoupleVisibility(couple.id, { inGallery: v })}
            label="Visible en galería"
            hint="Es el mismo interruptor del paso Galería pública y del ojo en la lista de Parejas."
          />
          <Toggle
            checked={couple.portalStatus === "suspended"}
            onChange={(v) => repo.setPortalStatus(couple.id, v ? "suspended" : "active")}
            label="Suspender portal"
            hint="La pareja puede entrar, pero ve “Presentación suspendida”. No se borra nada."
          />
        </div>
      </Section>

      <Section title="Eliminar historia" hint="Borra la historia, las cuentas de la pareja y todos sus archivos del almacenamiento. No se puede deshacer.">
        <button type="button" className="btn btn--danger" onClick={() => setDeleting(true)}>
          Eliminar pareja
        </button>
      </Section>

      {deleting && (
        <DeleteModal
          names={couple.names}
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            await repo.deleteCouple(couple.id);
            router.push("/parejas");
          }}
        />
      )}
    </>
  );
}

function MemberRow({
  member,
  coupleId,
  flash,
  onLink,
}: {
  member: Member;
  coupleId: string;
  flash: (m: string) => void;
  onLink: (l: InviteLink) => void;
}) {
  const [email, setEmail] = useState(member.email);
  const [error, setError] = useState("");
  const locked = member.status === "active" || member.status === "revoked";
  const save = async () => {
    setError("");
    try {
      await repo.saveMember(coupleId, email, member.id);
      flash("Correo guardado");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };
  return (
    <li className="member">
      <div className="member__main">
        <input className="member__input" type="email" value={email} disabled={locked} onChange={(e) => setEmail(e.target.value)} aria-label="Correo" />
        {!locked && (
          <button type="button" className="icon-btn" aria-label="Guardar correo" title="Guardar" disabled={email === member.email} onClick={save}>
            <SaveIcon />
          </button>
        )}
        <span className={`badge badge--${member.status}`}>{STATUS[member.status]}</span>
        {member.name && <span className="eyebrow">{member.name}</span>}
      </div>
      <div className="member__actions">
        {(member.status === "invited" || member.status === "expired") && (
          <button type="button" className="link-btn" onClick={async () => onLink(await repo.resendInvite(member.id))}>
            Reenviar
          </button>
        )}
        {(member.status === "invited" || member.status === "active") && (
          <button type="button" className="link-btn" onClick={() => confirm(`¿Revocar el acceso de ${member.email}?`) && repo.revokeMember(member.id)}>
            Revocar acceso
          </button>
        )}
        {member.status !== "active" && (
          <button type="button" className="link-btn link-btn--danger" onClick={() => repo.removeMember(member.id)}>
            Quitar
          </button>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
    </li>
  );
}

function DraftRow({
  value,
  onChange,
  onSave,
  onRemove,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => Promise<void>;
  onRemove: () => void;
}) {
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    try {
      await onSave(value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };
  return (
    <li className="member">
      <div className="member__main">
        <input
          className="member__input"
          type="email"
          placeholder="correo@ejemplo.com"
          value={value}
          autoFocus
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          aria-label="Nuevo correo"
        />
        <button type="button" className="icon-btn" aria-label="Guardar correo" title="Guardar" disabled={!value.trim()} onClick={save}>
          <SaveIcon />
        </button>
        <span className="badge">Nuevo</span>
      </div>
      <div className="member__actions">
        <button type="button" className="link-btn" onClick={onRemove}>
          Descartar
        </button>
      </div>
      {error && <span className="form-error">{error}</span>}
    </li>
  );
}

function DeleteModal({ names, onClose, onConfirm }: { names: string; onClose: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <Modal title="Eliminar pareja" onClose={onClose}>
      <p>
        Se borrarán la historia de <strong>{names}</strong>, sus cuentas y todos sus archivos. Antes de seguir, descarga un respaldo desde su
        portal si lo necesitas.
      </p>
      <label className="field">
        <span className="field__label">Escribe “{names}” para confirmar</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </label>
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn--danger" disabled={typed.trim() !== names.trim()} onClick={onConfirm}>
          Eliminar definitivamente
        </button>
      </div>
    </Modal>
  );
}

function SaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M7 3v6h9V3M7 21v-7h10v7" />
    </svg>
  );
}
