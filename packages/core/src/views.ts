// Vistas: transforman la base (Db) en lo que consume cada pantalla.
// Son funciones puras para que sirvan igual con el mock que con Supabase.
import type { CoverageType, Db, MediaFile, PortfolioItem } from "./types";

/** Convierte una storageKey en URL. Cada app pasa el suyo (basePath en el mock, R2 en real). */
export type ResolveUrl = (key: string) => string;

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function toPortfolio(db: Db, resolve: ResolveUrl): PortfolioItem[] {
  const fileById = new Map(db.files.map((f) => [f.id, f]));
  const url = (f: MediaFile | undefined) => (f && f.storageKey ? resolve(f.storageKey) : "");

  return db.couples
    .filter((c) => c.inGallery && c.inPortfolio && !c.deletedAt)
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder)
    .map((c) => {
      const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
      const coverageIds = new Set(
        db.coverages.filter((cv) => cv.coupleId === c.id && cv.showInPortfolio).map((cv) => cv.id)
      );
      const items = db.publicItems
        .filter((pi) => pi.scope === "portfolio" && coverageIds.has(pi.coverageId))
        .sort(byOrder)
        .map((pi) => fileById.get(pi.fileId))
        .filter((f): f is MediaFile => !!f && f.published);
      const photos = items.filter((f) => f.kind === "photo");
      const video = items.find((f) => f.kind === "video");
      const tagIds = new Set(db.coupleTags.filter((ct) => ct.coupleId === c.id).map((ct) => ct.tagId));

      return {
        id: c.slug,
        couple: profile?.title || c.names,
        place: c.location,
        date: c.weddingDate,
        collection: db.plans.find((p) => p.id === c.planId)?.name ?? "",
        tags: db.tags.filter((t) => tagIds.has(t.id)).map((t) => t.name),
        story: profile?.description ?? "",
        cover: url(fileById.get(profile?.coverFileId ?? "")) || url(photos[0]),
        coverPos: profile?.coverPosition,
        video: video?.externalUrl ?? url(video),
        poster: video?.poster,
        photos: photos.map((f) => ({ src: url(f), w: f.width, h: f.height })),
      };
    });
}

/** Fila de la lista "Parejas" del admin. */
export interface CoupleSummary {
  id: string;
  slug: string;
  names: string;
  planName: string;
  coverages: CoverageType[];
  photoCount: number;
  videoCount: number;
  cover: string;
  coverPos?: string;
  inGallery: boolean;
  inPortfolio: boolean;
  portalStatus: "active" | "suspended";
}

export function toCoupleSummaries(db: Db, resolve: ResolveUrl): CoupleSummary[] {
  return db.couples
    .filter((c) => !c.deletedAt)
    .map((c) => {
      const coverages = db.coverages.filter((cv) => cv.coupleId === c.id);
      const momentIds = new Set(
        db.moments.filter((m) => coverages.some((cv) => cv.id === m.coverageId)).map((m) => m.id)
      );
      const files = db.files.filter((f) => momentIds.has(f.momentId));
      const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
      const cover = files.find((f) => f.id === profile?.coverFileId) ?? files.find((f) => f.kind === "photo");
      return {
        id: c.id,
        slug: c.slug,
        names: c.names,
        planName: db.plans.find((p) => p.id === c.planId)?.name ?? "Sin plan",
        coverages: coverages.map((cv) => cv.type),
        photoCount: files.filter((f) => f.kind === "photo").length,
        videoCount: files.filter((f) => f.kind === "video").length,
        cover: cover?.storageKey ? resolve(cover.storageKey) : "",
        coverPos: profile?.coverPosition,
        inGallery: c.inGallery,
        inPortfolio: c.inPortfolio,
        portalStatus: c.portalStatus,
      };
    });
}

export const COVERAGE_LABEL: Record<CoverageType, string> = {
  boda: "Boda",
  preboda: "Preboda",
  pedida: "Pedida",
};
