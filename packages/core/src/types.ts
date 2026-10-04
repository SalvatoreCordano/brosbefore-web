// Modelo de datos compartido por web, portal y admin.
// Mismos nombres que las tablas previstas en Supabase (docs/REQUERIMIENTOS.md §13):
// migrar es cambiar MockRepo por SupabaseRepo, no estas formas.

export type Id = string;

export type CoverageType = "boda" | "preboda" | "pedida";
export type PortalStatus = "active" | "suspended";
export type MemberStatus = "saved" | "invited" | "active" | "expired" | "revoked";
export type PresItemRole = "main_video" | "secondary_video" | "featured_photo";
export type PublicScope = "gallery" | "portfolio";
export type MediaKind = "photo" | "video";

export interface Plan {
  id: Id;
  name: string; // "the story™"
  description: string;
  priceFrom: number; // en soles
  includes: string[];
}

export interface Couple {
  id: Id;
  slug: string; // URL pública: /galeria/{slug}
  names: string; // "Ceziel & Gianfranco"
  planId: Id | null;
  location: string;
  weddingDate: string; // texto libre ("7 de agosto, 2024")
  inGallery: boolean;
  inPortfolio: boolean;
  portfolioOrder: number;
  portalStatus: PortalStatus;
  createdAt: string;
  deletedAt: string | null;
}

export interface Coverage {
  id: Id;
  coupleId: Id;
  type: CoverageType;
  date: string;
  location: string;
  showInGallery: boolean;
  showInPortfolio: boolean;
}

/** Etapa dentro de una cobertura ("Ceremonia"). Se crea a partir de cada carpeta subida. */
export interface Moment {
  id: Id;
  coverageId: Id;
  name: string;
  order: number;
}

export interface MediaFile {
  id: Id;
  momentId: Id;
  kind: MediaKind;
  name: string; // nombre original del archivo
  /** clave en el almacenamiento: R2 en real; en el mock "idb:…" (navegador), ruta en /assets o URL */
  storageKey: string;
  /** solo mock: video alojado fuera (YouTube) mientras no haya R2 */
  externalUrl?: string;
  poster?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes?: number;
  takenAt?: string;
  order: number;
  /** solo los archivos publicados aparecen en las descargas del portal */
  published: boolean;
}

/** Referencia a una imagen o video: un archivo de la historia o uno subido aparte. */
export interface MediaRef {
  fileId?: Id;
  key?: string;
  kind: MediaKind;
}

export interface PublicProfile {
  coupleId: Id;
  coverFileId: Id | null;
  /** encuadre de la portada dentro de la card vertical (CSS object-position) */
  coverPosition?: string;
  coverMotionKey: string | null; // portada animada (MP4/WebM/GIF)
  banner: MediaRef | null;
  title: string;
  description: string;
}

export interface PublicItem {
  id: Id;
  coverageId: Id;
  fileId: Id;
  scope: PublicScope;
  order: number;
}

export interface PresItem {
  id: Id;
  coverageId: Id;
  fileId: Id;
  role: PresItemRole;
  order: number;
}

export interface PresentationContent {
  banner: MediaRef | null;
  songKey: string | null;
  songName: string | null;
  message: string;
  messageSignature: string;
}

/** La presentación del portal: se edita en borrador y la pareja ve la última versión publicada. */
export interface Presentation extends PresentationContent {
  coupleId: Id;
  publishedAt: string | null;
  published: (PresentationContent & { items: PresItem[] }) | null;
  updatedAt: string;
}

export interface Tag {
  id: Id;
  name: string;
}

export interface CoupleTag {
  coupleId: Id;
  tagId: Id;
}

export interface Member {
  id: Id;
  coupleId: Id;
  email: string;
  name: string;
  status: MemberStatus;
  invitedAt: string | null;
  /** solo mock: en real lo maneja Supabase Auth */
  inviteToken: string | null;
  passwordHash: string | null;
}

export interface Testimonial {
  id: Id;
  coupleId: Id;
  memberId: Id;
  originalText: string;
  publishedText: string;
  reposted: boolean;
  updatedAt: string;
}

/** Toda la base del mock en un objeto (en Supabase: una tabla por clave). */
export interface Db {
  version: number;
  plans: Plan[];
  couples: Couple[];
  coverages: Coverage[];
  moments: Moment[];
  files: MediaFile[];
  publicProfiles: PublicProfile[];
  publicItems: PublicItem[];
  presentations: Presentation[];
  presItems: PresItem[];
  tags: Tag[];
  coupleTags: CoupleTag[];
  members: Member[];
  testimonials: Testimonial[];
}

/** Vista que consume el carrusel de la home (y su detalle). */
export interface PortfolioPhoto {
  src: string;
  w?: number;
  h?: number;
}
export interface PortfolioItem {
  id: string; // slug
  couple: string;
  place: string;
  date: string;
  collection: string;
  tags: string[];
  story: string;
  cover: string;
  coverPos?: string;
  coverMotion?: string;
  video: string;
  poster?: string;
  photos: PortfolioPhoto[];
}
