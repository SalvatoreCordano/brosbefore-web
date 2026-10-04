// Datos iniciales del mock: las parejas del sitio actual convertidas al modelo nuevo,
// más ejemplos (pedida, preboda, momentos, presentación publicada, cuentas y testimonios)
// para poder mostrar el flujo completo en una demo.
import type { CoverageType, Db, MediaFile, Plan, PresItem, PublicItem, Tag } from "../types";
import { legacyWorks } from "./legacy-works";

export const DB_VERSION = 2;

/** Cuentas de prueba del portal (solo existen en la demo). */
export const DEMO_ACCOUNTS = [
  { email: "ceziel@demo.brosbefore.pe", password: "demo1234", couple: "Ceziel & Gianfranco" },
  { email: "gabriela@demo.brosbefore.pe", password: "demo1234", couple: "Paul & Gabriela" },
];
// sha256(`${email}:${password}`) — mismo cálculo que MockRepo.hashPassword
const DEMO_HASHES: Record<string, string> = {
  "ceziel@demo.brosbefore.pe": "11e896fa46f90b40dac9f5d2dfd417705604a336b91050868069c4ce53d05a68",
  "gabriela@demo.brosbefore.pe": "764a13b30b73bd2fee50122ac42dad2f3011c05696a59ca7a7b74d93a0d7d213",
};

const SEED_DATE = "2026-10-04T00:00:00.000Z";

export const seedPlans: Plan[] = [
  {
    id: "plan_essentials",
    name: "essentials™",
    description: "Lo esencial para recordar su día tal como fue.",
    priceFrom: 4500,
    includes: [
      "El día de la boda, hasta 6 horas de cobertura continua",
      "1 fotógrafo principal y 1 filmmaker",
      "Galería online personalizada (+300 fotos)",
      "Un highlight film (2:30 a 3 min)",
    ],
  },
  {
    id: "plan_story",
    name: "the story™",
    description: "Para quienes quieren verse, sentirse y reconocerse en su historia.",
    priceFrom: 8000,
    includes: [
      "2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 8 hrs)",
      "1 fotógrafo principal y 1 filmmaker",
      "Galería online personalizada (+500 fotos), algunas análogas (cámara a rollo)",
      "Un story film (3 a 4:30 min)",
      "Un wedding reel (en 24 hrs / 30 s)",
    ],
  },
  {
    id: "plan_legacy",
    name: "the legacy™",
    description: "Para quienes entienden que este recuerdo no es solo para hoy.",
    priceFrom: 12000,
    includes: [
      "2 días: sesión pre-boda (fotos y video) y el día de la boda (hasta 12 hrs)",
      "2 fotógrafos y 2 filmmakers",
      "Galería online personalizada (+800 fotos)",
      "Galería análoga (+150 fotos en 35mm y 120mm)",
      "Un legacy film (7 a 10 min)",
      "Un wedding reel (en 24 hrs / 1 min)",
      "Un dump de video (carrusel IG / 24 hrs / 5 videos colorizados)",
    ],
  },
];

// fotos de relleno para las coberturas de ejemplo (pedida / preboda)
const picsum = (seed: string, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const wide = i % 3 === 0;
    const [w, h] = wide ? [1200, 800] : [800, 1000];
    return { src: `https://picsum.photos/seed/bb-${seed}-${i}/${w}/${h}`, w, h };
  });

/** Coberturas extra de ejemplo: {slug: [[tipo, fecha, lugar, momentos]]} */
const EXTRA: Record<string, [CoverageType, string, string, [string, number][]][]> = {
  "ceziel-gianfranco": [
    ["pedida", "Diciembre 2023", "Cusco, Perú", [["La pregunta", 4], ["Después", 3]]],
    ["preboda", "Junio 2024", "Paracas, Perú", [["Desierto", 4], ["Atardecer", 4]]],
  ],
  "diego-ale": [["preboda", "Agosto 2024", "Lima, Perú", [["Barranco", 5]]]],
};

/** Momentos de ejemplo para la boda de Ceziel & Gianfranco (en el orden de sus 7 fotos). */
const CEZIEL_MOMENTS: [string, number][] = [
  ["Preparativos", 2],
  ["Ceremonia", 3],
  ["Celebración", 2],
];

export function buildSeed(): Db {
  const db: Db = {
    version: DB_VERSION,
    plans: seedPlans,
    couples: [],
    coverages: [],
    moments: [],
    files: [],
    publicProfiles: [],
    publicItems: [],
    presentations: [],
    presItems: [],
    tags: [],
    coupleTags: [],
    members: [],
    testimonials: [],
  };
  const tagByName = new Map<string, Tag>();
  const publicize = (coverageId: string, files: MediaFile[], scopes: ("gallery" | "portfolio")[]) =>
    scopes.forEach((scope) =>
      files.forEach((f, n) =>
        db.publicItems.push({ id: `pi_${scope}_${f.id}`, coverageId, fileId: f.id, scope, order: n } satisfies PublicItem)
      )
    );

  legacyWorks.forEach((w, i) => {
    const slug = w.id;
    const coupleId = `c_${slug}`;
    const plan = seedPlans.find((p) => p.name === w.collection) ?? null;

    db.couples.push({
      id: coupleId,
      slug,
      names: w.couple,
      planId: plan?.id ?? null,
      location: w.place,
      weddingDate: w.date,
      inGallery: true,
      inPortfolio: true,
      portfolioOrder: i,
      portalStatus: "active",
      createdAt: SEED_DATE,
      deletedAt: null,
    });

    // ---- boda (las fotos reales del sitio) ----
    const bodaId = `cv_${slug}_boda`;
    db.coverages.push({
      id: bodaId,
      coupleId,
      type: "boda",
      date: w.date,
      location: w.place,
      showInGallery: true,
      showInPortfolio: true,
    });
    const groups: [string, number][] = slug === "ceziel-gianfranco" ? CEZIEL_MOMENTS : [["General", w.photos.length]];
    const bodaFiles: MediaFile[] = [];
    let p = 0;
    groups.forEach(([name, count], mi) => {
      const momentId = `m_${slug}_boda_${mi}`;
      db.moments.push({ id: momentId, coverageId: bodaId, name, order: mi });
      w.photos.slice(p, p + count).forEach((ph, n) =>
        bodaFiles.push({
          id: `f_${slug}_${String(p + n + 1).padStart(2, "0")}`,
          momentId,
          kind: "photo",
          name: ph.src.split("/").pop() ?? `foto-${p + n + 1}.jpg`,
          storageKey: ph.src,
          width: ph.w,
          height: ph.h,
          order: n,
          published: true,
        })
      );
      p += count;
    });
    if (w.video) {
      bodaFiles.push({
        id: `f_${slug}_film`,
        momentId: `m_${slug}_boda_0`,
        kind: "video",
        name: "Film.mp4",
        storageKey: "",
        externalUrl: w.video,
        poster: w.poster,
        order: 99,
        published: true,
      });
    }
    db.files.push(...bodaFiles);
    publicize(bodaId, bodaFiles, ["gallery", "portfolio"]);

    // ---- coberturas extra de ejemplo ----
    for (const [type, date, location, moments] of EXTRA[slug] ?? []) {
      const coverageId = `cv_${slug}_${type}`;
      db.coverages.push({ id: coverageId, coupleId, type, date, location, showInGallery: true, showInPortfolio: false });
      const files: MediaFile[] = [];
      moments.forEach(([name, count], mi) => {
        const momentId = `m_${slug}_${type}_${mi}`;
        db.moments.push({ id: momentId, coverageId, name, order: mi });
        picsum(`${slug}-${type}-${mi}`, count).forEach((ph, n) =>
          files.push({
            id: `f_${slug}_${type}_${mi}_${n}`,
            momentId,
            kind: "photo",
            name: `${name.toLowerCase().replace(/\s+/g, "-")}-${n + 1}.jpg`,
            storageKey: ph.src,
            width: ph.w,
            height: ph.h,
            order: n,
            published: true,
          })
        );
      });
      db.files.push(...files);
      publicize(coverageId, files.slice(0, 6), ["gallery"]);
    }

    // ---- ficha pública ----
    const photos = bodaFiles.filter((f) => f.kind === "photo");
    const cover = photos.find((f) => f.storageKey === w.cover) ?? photos[0];
    const wide = photos.find((f) => (f.width ?? 0) > (f.height ?? 0));
    db.publicProfiles.push({
      coupleId,
      coverFileId: cover?.id ?? null,
      coverPosition: w.coverPos,
      coverMotionKey: null,
      banner: wide ? { fileId: wide.id, kind: "photo" } : cover ? { fileId: cover.id, kind: "photo" } : null,
      title: w.couple,
      description: w.story,
    });

    // ---- presentación (borrador vacío) ----
    db.presentations.push({
      coupleId,
      banner: null,
      songKey: null,
      songName: null,
      message: "",
      messageSignature: "— Carozzi & Zelmar",
      publishedAt: null,
      published: null,
      updatedAt: SEED_DATE,
    });

    w.tags.forEach((name) => {
      let tag = tagByName.get(name);
      if (!tag) {
        tag = { id: `t_${tagByName.size + 1}`, name };
        tagByName.set(name, tag);
      }
      db.coupleTags.push({ coupleId, tagId: tag.id });
    });
  });
  db.tags = [...tagByName.values()];

  addDemoStory(db);
  return db;
}

/** Ceziel & Gianfranco: historia completa (presentación publicada, cuentas, testimonio). */
function addDemoStory(db: Db) {
  const coupleId = "c_ceziel-gianfranco";
  const pres = db.presentations.find((p) => p.coupleId === coupleId);
  if (!pres) return;

  const items: PresItem[] = [];
  const add = (coverageId: string, fileId: string, role: PresItem["role"], order: number) =>
    items.push({ id: `pres_${fileId}_${role}`, coverageId, fileId, role, order });
  db.coverages
    .filter((cv) => cv.coupleId === coupleId)
    .forEach((cv) => {
      const momentIds = new Set(db.moments.filter((m) => m.coverageId === cv.id).map((m) => m.id));
      const files = db.files.filter((f) => momentIds.has(f.momentId));
      files.filter((f) => f.kind === "video").forEach((f, n) => add(cv.id, f.id, n === 0 ? "main_video" : "secondary_video", n));
      files.filter((f) => f.kind === "photo").forEach((f, n) => add(cv.id, f.id, "featured_photo", n));
    });
  db.presItems.push(...items);

  Object.assign(pres, {
    banner: { fileId: "f_ceziel-gianfranco_05", kind: "photo" },
    message:
      "Gracias por dejarnos entrar a su historia desde la pregunta hasta el último baile. Hicimos esto con todo el cariño para que vuelvan a este día cada vez que quieran.",
    messageSignature: "— Carozzi & Zelmar",
    publishedAt: SEED_DATE,
  });
  pres.published = {
    banner: pres.banner,
    songKey: null,
    songName: null,
    message: pres.message,
    messageSignature: pres.messageSignature,
    items: structuredClone(items),
  };

  db.members.push(
    {
      id: "mem_ceziel",
      coupleId,
      email: "ceziel@demo.brosbefore.pe",
      name: "Ceziel",
      status: "active",
      invitedAt: SEED_DATE,
      inviteToken: null,
      passwordHash: DEMO_HASHES["ceziel@demo.brosbefore.pe"],
    },
    {
      id: "mem_gianfranco",
      coupleId,
      email: "gianfranco@demo.brosbefore.pe",
      name: "",
      status: "invited",
      invitedAt: SEED_DATE,
      inviteToken: "demo-invitacion-gianfranco",
      passwordHash: null,
    },
    {
      id: "mem_gabriela",
      coupleId: "c_paul-gabriela",
      email: "gabriela@demo.brosbefore.pe",
      name: "Gabriela",
      status: "active",
      invitedAt: SEED_DATE,
      inviteToken: null,
      passwordHash: DEMO_HASHES["gabriela@demo.brosbefore.pe"],
    }
  );

  db.testimonials.push(
    {
      id: "tes_ceziel",
      coupleId,
      memberId: "mem_ceziel",
      originalText:
        "chicos gracias de verdad, lloramos viendo el video!!! se nota todo el amor q le ponen, los recomendamos 100%",
      publishedText:
        "Lloramos viendo el film. Se nota todo el amor que le ponen a cada detalle. Los recomendamos con los ojos cerrados.",
      reposted: true,
      updatedAt: SEED_DATE,
    },
    {
      id: "tes_gabriela",
      coupleId: "c_paul-gabriela",
      memberId: "mem_gabriela",
      originalText: "Nos encantó todo, las fotos quedaron hermosas y el equipo fue súper atento todo el día.",
      publishedText: "",
      reposted: false,
      updatedAt: SEED_DATE,
    }
  );
}
