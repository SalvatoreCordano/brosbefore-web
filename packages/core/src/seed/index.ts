// Datos iniciales del mock: las parejas del sitio actual convertidas al modelo nuevo.
// Cada pareja entra con una cobertura Boda y un momento "General" con todas sus fotos.
import type { Db, MediaFile, Plan, PublicItem, Tag, CoupleTag } from "../types";
import { legacyWorks } from "./legacy-works";

export const DB_VERSION = 1;

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

  legacyWorks.forEach((w, i) => {
    const slug = w.id;
    const coupleId = `c_${slug}`;
    const coverageId = `cv_${slug}_boda`;
    const momentId = `m_${slug}_boda_general`;
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
    db.coverages.push({
      id: coverageId,
      coupleId,
      type: "boda",
      date: w.date,
      location: w.place,
      showInGallery: true,
      showInPortfolio: true,
    });
    db.moments.push({ id: momentId, coverageId, name: "General", order: 0 });

    const files: MediaFile[] = w.photos.map((p, n) => ({
      id: `f_${slug}_${String(n + 1).padStart(2, "0")}`,
      momentId,
      kind: "photo",
      storageKey: p.src,
      width: p.w,
      height: p.h,
      order: n,
      published: true,
    }));
    if (w.video) {
      files.push({
        id: `f_${slug}_film`,
        momentId,
        kind: "video",
        storageKey: "",
        externalUrl: w.video,
        poster: w.poster,
        order: files.length,
        published: true,
      });
    }
    db.files.push(...files);

    const cover = files.find((f) => f.storageKey === w.cover) ?? files[0];
    const banner = files.find((f) => f.kind === "photo" && (f.width ?? 0) > (f.height ?? 0)) ?? null;
    db.publicProfiles.push({
      coupleId,
      coverFileId: cover?.id ?? null,
      coverPosition: w.coverPos,
      bannerFileId: banner?.id ?? null,
      title: w.couple,
      description: w.story,
    });

    // por ahora la galería y el portafolio muestran la misma selección: todo lo publicado
    for (const scope of ["gallery", "portfolio"] as const) {
      files.forEach((f, n) =>
        db.publicItems.push({ id: `pi_${scope}_${f.id}`, coverageId, fileId: f.id, scope, order: n } satisfies PublicItem)
      );
    }

    db.presentations.push({
      coupleId,
      bannerFileId: banner?.id ?? null,
      songKey: null,
      message: "",
      messageSignature: "— Carozzi & Zelmar",
      publishedAt: null,
    });

    w.tags.forEach((name) => {
      let tag = tagByName.get(name);
      if (!tag) {
        tag = { id: `t_${tagByName.size + 1}`, name };
        tagByName.set(name, tag);
      }
      db.coupleTags.push({ coupleId, tagId: tag.id } satisfies CoupleTag);
    });
  });

  db.tags = [...tagByName.values()];
  return db;
}
