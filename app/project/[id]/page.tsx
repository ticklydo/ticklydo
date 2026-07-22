"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import ProjectBoard from "../../components/ProjectBoard";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  // Názov prenesený z Domovskej stránky (pri vytvorení/kliknutí na projekt) — zobrazí sa hneď,
  // kým sa reálne dáta projektu nenačítajú z Firestore (predtým tu bliklo generické "Projekt").
  const nameFromUrl = searchParams.get("name") || "";
  return <ProjectBoard projectId={id} projectName={nameFromUrl} />;
}