// Vistas: transforman la base (Db) en lo que consume cada pantalla.
// Son funciones puras para que sirvan igual con el mock que con Supabase.
import type {
  Coverage,
  CoverageType,
  Db,
  Id,
  MediaFile,
  MediaRef,
  PortfolioItem,
  PresItem,
  PublicScope,
} from "./types";

/** Convierte una storageKey en URL. Cada app pasa la suya (basePath/IndexedDB en el mock, R2 en real). */
export type ResolveUrl = (key: string) => string;

export const COVERAGE_LABEL: Record<CoverageType, string> = {
  boda: "Boda",
  preboda: "Preboda",
  pedida: "Pedida",
};
export const COVERAGE_ORDER: CoverageType[] = ["pedida", "preboda", "boda"];

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;
const byCoverageOrder = (a: Coverage, b: Coverage) => COVERAGE_ORDER.indexOf(a.type) - COVERAGE_ORDER.indexOf(b.type);

export interface MediaView {
  id: Id;
  kind: "photo" | "video";
  src: string; // URL del archivo ("" si el video está en YouTube)
  external?: string; // URL de embed de YouTube (solo mock)
  poster?: string;
  w?: number;
  h?: number;
  name: string;
  size?: number;
}

export function mediaView(f: MediaFile, resolve: ResolveUrl): MediaView {
  return {
    id: f.id,
    kind: f.kind,
    src: f.storageKey ? resolve(f.storageKey) : "",
    external: f.externalUrl,
    poster: f.poster ? resolve(f.poster) : undefined,
    w: f.width,
    h: f.height,
    name: f.name,
    size: f.sizeBytes,
  };
}

export function refView(db: Db, ref: MediaRef | null | undefined, resolve: ResolveUrl): MediaView | null {
  if (!ref) return null;
  if (ref.fileId) {
    const f = db.files.find((x) => x.id === ref.fileId);
    return f ? mediaView(f, resolve) : null;
  }
  if (ref.key) return { id: ref.key, kind: ref.kind, src: resolve(ref.key), name: "" };
  return null;
}

/** Archivos de una cobertura agrupados por momento, en orden. */
export function coverageMoments(db: Db, coverageId: Id) {
  return db.moments
    .filter((m) => m.coverageId === coverageId)
    .sort(byOrder)
    .map((m) => ({ moment: m, files: db.files.filter((f) => f.momentId === m.id).sort(byOrder) }));
}

const planName = (db: Db, planId: Id | null) => db.plans.find((p) => p.id === planId)?.name ?? "";
const tagsOf = (db: Db, coupleId: Id) => {
  const ids = new Set(db.coupleTags.filter((t) => t.coupleId === coupleId).map((t) => t.tagId));
  return db.tags.filter((t) => ids.has(t.id)).map((t) => t.name);
};
const visibleCouples = (db: Db) =>
  db.couples
    .filter((c) => c.inGallery && !c.deletedAt)
    .sort((a, b) => a.portfolioOrder - b.portfolioOrder || a.createdAt.localeCompare(b.createdAt));

/** Archivos seleccionados para la web en una cobertura (galería o portafolio). */
function scopeFiles(db: Db, coverageId: Id, scope: PublicScope) {
  const byId = new Map(db.files.map((f) => [f.id, f]));
  return db.publicItems
    .filter((i) => i.coverageId === coverageId && i.scope === scope)
    .sort(byOrder)
    .map((i) => byId.get(i.fileId))
    .filter((f): f is MediaFile => !!f);
}

// ---------------------------------------------------------------- home

export function toPortfolio(db: Db, resolve: ResolveUrl): PortfolioItem[] {
  return visibleCouples(db)
    .filter((c) => c.inPortfolio)
    .map((c) => {
      const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
      const coverages = db.coverages.filter((cv) => cv.coupleId === c.id && cv.showInPortfolio).sort(byCoverageOrder);
      const items = coverages.flatMap((cv) => scopeFiles(db, cv.id, "portfolio"));
      const photos = items.filter((f) => f.kind === "photo");
      const video = items.find((f) => f.kind === "video");
      const cover = db.files.find((f) => f.id === profile?.coverFileId) ?? photos[0];
      return {
        id: c.slug,
        couple: profile?.title || c.names,
        place: c.location,
        date: c.weddingDate,
        collection: planName(db, c.planId),
        tags: tagsOf(db, c.id),
        story: profile?.description ?? "",
        cover: cover ? resolve(cover.storageKey) : "",
        coverPos: profile?.coverPosition,
        coverMotion: profile?.coverMotionKey ? resolve(profile.coverMotionKey) : undefined,
        video: video ? video.externalUrl ?? resolve(video.storageKey) : "",
        poster: video?.poster,
        photos: photos.map((f) => ({ src: resolve(f.storageKey), w: f.width, h: f.height })),
      };
    })
    .filter((w) => w.cover);
}

// ---------------------------------------------------------------- galería

export interface GalleryCard {
  slug: string;
  names: string;
  location: string;
  planName: string;
  cover: string;
  coverPos?: string;
  coverMotion?: string;
  coverages: CoverageType[];
}

export function toGalleryCards(db: Db, resolve: ResolveUrl): GalleryCard[] {
  return visibleCouples(db)
    .map((c) => {
      const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
      const coverages = db.coverages
        .filter((cv) => cv.coupleId === c.id && cv.showInGallery && scopeFiles(db, cv.id, "gallery").length)
        .sort(byCoverageOrder);
      const cover =
        db.files.find((f) => f.id === profile?.coverFileId) ??
        coverages.flatMap((cv) => scopeFiles(db, cv.id, "gallery")).find((f) => f.kind === "photo");
      return {
        slug: c.slug,
        names: profile?.title || c.names,
        location: c.location,
        planName: planName(db, c.planId),
        cover: cover ? resolve(cover.storageKey) : "",
        coverPos: profile?.coverPosition,
        coverMotion: profile?.coverMotionKey ? resolve(profile.coverMotionKey) : undefined,
        coverages: coverages.map((cv) => cv.type),
      };
    })
    .filter((c) => c.cover && c.coverages.length);
}

export interface ProfileView {
  slug: string;
  title: string;
  location: string;
  date: string;
  planName: string;
  tags: string[];
  description: string;
  banner: MediaView | null;
  coverages: {
    type: CoverageType;
    label: string;
    date: string;
    location: string;
    videos: MediaView[];
    moments: { name: string; photos: MediaView[] }[];
  }[];
  testimonial: { text: string; signature: string } | null;
  next: { slug: string; title: string } | null;
}

export function toPublicProfile(db: Db, slug: string, resolve: ResolveUrl): ProfileView | null {
  const couples = visibleCouples(db);
  const i = couples.findIndex((c) => c.slug === slug);
  const c = couples[i];
  if (!c) return null;
  const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
  const momentById = new Map(db.moments.map((m) => [m.id, m]));

  const coverages = db.coverages
    .filter((cv) => cv.coupleId === c.id && cv.showInGallery)
    .sort(byCoverageOrder)
    .map((cv) => {
      const files = scopeFiles(db, cv.id, "gallery");
      // agrupa las fotos por momento, en el orden de los momentos
      const groups = new Map<Id, MediaView[]>();
      files
        .filter((f) => f.kind === "photo")
        .forEach((f) => groups.set(f.momentId, [...(groups.get(f.momentId) ?? []), mediaView(f, resolve)]));
      const moments = [...groups.entries()]
        .sort((a, b) => (momentById.get(a[0])?.order ?? 0) - (momentById.get(b[0])?.order ?? 0))
        .map(([id, photos]) => ({ name: momentById.get(id)?.name ?? "", photos }));
      return {
        type: cv.type,
        label: COVERAGE_LABEL[cv.type],
        date: cv.date,
        location: cv.location,
        videos: files.filter((f) => f.kind === "video").map((f) => mediaView(f, resolve)),
        moments,
      };
    })
    .filter((cv) => cv.videos.length || cv.moments.length);

  const t = db.testimonials.find((x) => x.coupleId === c.id && x.reposted);
  const next = couples.length > 1 ? couples[(i + 1) % couples.length] : null;
  return {
    slug: c.slug,
    title: profile?.title || c.names,
    location: c.location,
    date: c.weddingDate,
    planName: planName(db, c.planId),
    tags: tagsOf(db, c.id),
    description: profile?.description ?? "",
    banner:
      refView(db, profile?.banner, resolve) ??
      refView(db, profile?.coverFileId ? { fileId: profile.coverFileId, kind: "photo" } : null, resolve),
    coverages,
    testimonial: t ? { text: t.publishedText, signature: c.names } : null,
    next: next ? { slug: next.slug, title: db.publicProfiles.find((p) => p.coupleId === next.id)?.title || next.names } : null,
  };
}

// ---------------------------------------------------------------- portal

export interface PresentationView {
  names: string;
  date: string;
  location: string;
  banner: MediaView | null;
  song: { src: string; name: string } | null;
  message: string;
  signature: string;
  coverages: {
    type: CoverageType;
    label: string;
    date: string;
    location: string;
    mainVideo: MediaView | null;
    secondaryVideos: MediaView[];
    moments: { name: string; photos: MediaView[] }[];
  }[];
}

/** mode "published": lo que ve la pareja · "draft": vista previa del admin */
export function toPresentation(db: Db, coupleId: Id, mode: "published" | "draft", resolve: ResolveUrl): PresentationView | null {
  const c = db.couples.find((x) => x.id === coupleId);
  const p = db.presentations.find((x) => x.coupleId === coupleId);
  if (!c || !p) return null;
  const coverageIds = new Set(db.coverages.filter((cv) => cv.coupleId === coupleId).map((cv) => cv.id));
  const src = mode === "published" ? p.published : { ...p, items: db.presItems.filter((i) => coverageIds.has(i.coverageId)) };
  if (!src) return null;
  const fileById = new Map(db.files.map((f) => [f.id, f]));
  const momentById = new Map(db.moments.map((m) => [m.id, m]));
  const pick = (items: PresItem[]) =>
    items
      .sort(byOrder)
      .map((i) => fileById.get(i.fileId))
      .filter((f): f is MediaFile => !!f);

  const coverages = db.coverages
    .filter((cv) => cv.coupleId === coupleId)
    .sort(byCoverageOrder)
    .map((cv) => {
      const items = src.items.filter((i) => i.coverageId === cv.id);
      const main = pick(items.filter((i) => i.role === "main_video"))[0];
      const photos = pick(items.filter((i) => i.role === "featured_photo"));
      const groups = new Map<Id, MediaView[]>();
      photos.forEach((f) => groups.set(f.momentId, [...(groups.get(f.momentId) ?? []), mediaView(f, resolve)]));
      return {
        type: cv.type,
        label: COVERAGE_LABEL[cv.type],
        date: cv.date,
        location: cv.location,
        mainVideo: main ? mediaView(main, resolve) : null,
        secondaryVideos: pick(items.filter((i) => i.role === "secondary_video")).map((f) => mediaView(f, resolve)),
        moments: [...groups.entries()]
          .sort((a, b) => (momentById.get(a[0])?.order ?? 0) - (momentById.get(b[0])?.order ?? 0))
          .map(([id, ph]) => ({ name: momentById.get(id)?.name ?? "", photos: ph })),
      };
    })
    .filter((cv) => cv.mainVideo || cv.secondaryVideos.length || cv.moments.length);

  return {
    names: c.names,
    date: c.weddingDate,
    location: c.location,
    banner: refView(db, src.banner, resolve),
    song: src.songKey ? { src: resolve(src.songKey), name: src.songName ?? "Canción" } : null,
    message: src.message,
    signature: src.messageSignature,
    coverages,
  };
}

export interface DownloadsView {
  count: number;
  size: number;
  coverages: {
    type: CoverageType;
    label: string;
    count: number;
    size: number;
    moments: { id: Id; name: string; files: MediaView[]; size: number }[];
  }[];
}

/** Solo fotos y videos publicados (el trabajo entregado). */
export function toDownloads(db: Db, coupleId: Id, resolve: ResolveUrl): DownloadsView {
  const sum = (files: MediaView[]) => files.reduce((s, f) => s + (f.size ?? 0), 0);
  const coverages = db.coverages
    .filter((cv) => cv.coupleId === coupleId)
    .sort(byCoverageOrder)
    .map((cv) => {
      const moments = coverageMoments(db, cv.id)
        .map(({ moment, files }) => {
          const views = files.filter((f) => f.published).map((f) => mediaView(f, resolve));
          return { id: moment.id, name: moment.name, files: views, size: sum(views) };
        })
        .filter((m) => m.files.length);
      const all = moments.flatMap((m) => m.files);
      return { type: cv.type, label: COVERAGE_LABEL[cv.type], count: all.length, size: sum(all), moments };
    })
    .filter((cv) => cv.count);
  return {
    coverages,
    count: coverages.reduce((s, c) => s + c.count, 0),
    size: coverages.reduce((s, c) => s + c.size, 0),
  };
}

// ---------------------------------------------------------------- admin

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
  portfolioOrder: number;
  portalStatus: "active" | "suspended";
  progress: { done: number; total: number };
}

export function toCoupleSummaries(db: Db, resolve: ResolveUrl): CoupleSummary[] {
  return db.couples
    .filter((c) => !c.deletedAt)
    .map((c) => {
      const coverages = db.coverages.filter((cv) => cv.coupleId === c.id).sort(byCoverageOrder);
      const momentIds = new Set(db.moments.filter((m) => coverages.some((cv) => cv.id === m.coverageId)).map((m) => m.id));
      const files = db.files.filter((f) => momentIds.has(f.momentId));
      const profile = db.publicProfiles.find((p) => p.coupleId === c.id);
      const cover = files.find((f) => f.id === profile?.coverFileId) ?? files.find((f) => f.kind === "photo");
      const comp = completeness(db, c.id);
      return {
        id: c.id,
        slug: c.slug,
        names: c.names,
        planName: planName(db, c.planId) || "Sin plan",
        coverages: coverages.map((cv) => cv.type),
        photoCount: files.filter((f) => f.kind === "photo").length,
        videoCount: files.filter((f) => f.kind === "video").length,
        cover: cover ? resolve(cover.storageKey) : "",
        coverPos: profile?.coverPosition,
        inGallery: c.inGallery,
        inPortfolio: c.inPortfolio,
        portfolioOrder: c.portfolioOrder,
        portalStatus: c.portalStatus,
        progress: { done: comp.done, total: comp.items.length },
      };
    });
}

export type EditorStep = "datos" | "archivos" | "presentacion" | "galeria" | "agradecimientos" | "acceso";

export interface CompletenessItem {
  label: string;
  ok: boolean;
  step: EditorStep;
}

/** Qué le falta a una historia (indicador del editor y de la lista de parejas). */
export function completeness(db: Db, coupleId: Id) {
  const c = db.couples.find((x) => x.id === coupleId);
  const coverages = db.coverages.filter((cv) => cv.coupleId === coupleId);
  const momentIds = new Set(db.moments.filter((m) => coverages.some((cv) => cv.id === m.coverageId)).map((m) => m.id));
  const files = db.files.filter((f) => momentIds.has(f.momentId));
  const pres = db.presentations.find((p) => p.coupleId === coupleId);
  const profile = db.publicProfiles.find((p) => p.coupleId === coupleId);
  const coverageIds = new Set(coverages.map((cv) => cv.id));
  const presItems = db.presItems.filter((i) => coverageIds.has(i.coverageId));
  const withFiles = coverages.filter((cv) => files.some((f) => db.moments.find((m) => m.id === f.momentId)?.coverageId === cv.id));
  const members = db.members.filter((m) => m.coupleId === coupleId && m.status !== "revoked");

  const items: CompletenessItem[] = [
    { label: "Datos y plan", ok: !!c?.names && !!c.planId && coverages.length > 0, step: "datos" },
    { label: "Archivos subidos", ok: files.length > 0, step: "archivos" },
    { label: "Archivos publicados", ok: files.length > 0 && files.every((f) => f.published), step: "archivos" },
    {
      label: "Video principal en cada cobertura",
      ok:
        withFiles.length > 0 &&
        withFiles.every((cv) => !files.some((f) => f.kind === "video" && db.moments.find((m) => m.id === f.momentId)?.coverageId === cv.id) ||
          presItems.some((i) => i.coverageId === cv.id && i.role === "main_video")),
      step: "presentacion",
    },
    { label: "Fotos destacadas", ok: presItems.some((i) => i.role === "featured_photo"), step: "presentacion" },
    {
      label: "Presentación publicada",
      ok: !!pres?.publishedAt && pres.updatedAt <= pres.publishedAt,
      step: "presentacion",
    },
    { label: "Portada", ok: !c?.inGallery || !!profile?.coverFileId, step: "galeria" },
    { label: "Correos de la pareja", ok: members.length > 0, step: "acceso" },
  ];
  return { items, done: items.filter((i) => i.ok).length };
}

export function formatBytes(n: number) {
  if (!n) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
