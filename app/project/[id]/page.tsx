"use client";

import { use } from "react";
import ProjectBoard from "../../components/ProjectBoard";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectBoard projectId={id} projectName="" />;
}