import type { Metadata } from "next";
import { StoryEditor } from "@/components/editor/StoryEditor";

export const metadata: Metadata = { title: "Editor de historia — Admin (brosbefore)™" };

export default function HistoriaPage() {
  return <StoryEditor />;
}
