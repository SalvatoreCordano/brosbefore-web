"use client";
// Métricas. En el mock salen de los datos de ejemplo; el peso de los archivos es estimado.
import { useDb } from "@/lib/use-db";

const EST_PHOTO_MB = 12; // foto en alta resolución (mock: los archivos de ejemplo no traen tamaño)
const EST_VIDEO_MB = 4000; // film en 4K
const R2_USD_PER_GB = 0.015;

export default function Metricas() {
  const db = useDb();
  if (!db) return <p className="eyebrow">Cargando…</p>;

  const couples = db.couples.filter((c) => !c.deletedAt);
  const bytes = db.files.reduce(
    (sum, f) => sum + (f.sizeBytes ?? (f.kind === "photo" ? EST_PHOTO_MB : EST_VIDEO_MB) * 1024 ** 2),
    0
  );
  const gb = bytes / 1024 ** 3;
  const pendingTestimonials = db.testimonials.filter((t) => !t.reposted).length;
  const invited = db.members.filter((m) => m.status !== "saved").length;
  const active = db.members.filter((m) => m.status === "active").length;

  const stats = [
    { label: "Parejas", value: couples.length },
    { label: "En galería", value: couples.filter((c) => c.inGallery).length },
    { label: "En portafolio", value: couples.filter((c) => c.inPortfolio).length },
    { label: "Portales suspendidos", value: couples.filter((c) => c.portalStatus === "suspended").length },
    { label: "Invitaciones aceptadas", value: `${active} / ${invited}` },
    { label: "Agradecimientos por revisar", value: pendingTestimonials },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <span className="eyebrow">Resumen</span>
          <h1>Métricas</h1>
        </div>
      </header>

      <section className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span className="eyebrow">{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Almacenamiento</h2>
          <span className="eyebrow">Estimado · Cloudflare R2</span>
        </div>
        <div className="storage">
          <div>
            <strong>{gb.toFixed(1)} GB</strong>
            <span className="eyebrow">{db.files.length} archivos</span>
          </div>
          <div>
            <strong>${(gb * R2_USD_PER_GB).toFixed(2)}</strong>
            <span className="eyebrow">al mes (US$ {R2_USD_PER_GB} por GB)</span>
          </div>
        </div>
        <p className="hint">
          En la demo el peso se estima ({EST_PHOTO_MB} MB por foto, {EST_VIDEO_MB / 1000} GB por film). Con R2 se usará el
          tamaño real de cada archivo.
        </p>
      </section>
    </>
  );
}
