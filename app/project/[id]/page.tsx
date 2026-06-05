"use client";
 
import ProjectBoard from "../../components/ProjectBoard";
 
export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectBoard projectId={params.id} projectName="" />;
}
 