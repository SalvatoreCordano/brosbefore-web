import { buildSeed } from "@bb/core";
import { PublicProfile } from "@/components/PublicProfile";

// Export estático: se generan de antemano las fichas de las parejas de ejemplo.
// Las que se creen en el admin durante una demo se abren desde not-found (ver app/not-found.tsx).
export function generateStaticParams() {
  return buildSeed()
    .couples.filter((c) => c.inGallery)
    .map((c) => ({ slug: c.slug }));
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicProfile slug={decodeURIComponent(slug)} />;
}
