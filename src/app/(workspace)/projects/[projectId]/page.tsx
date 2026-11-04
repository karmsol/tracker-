"use client";

import { useParams } from "next/navigation";
import { TaskScreen } from "@/components/task-screen";
import { useWorkspace } from "@/components/workspace";

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const { data } = useWorkspace();
  const project = data.projects.find((item) => item.id === params.projectId);
  return <TaskScreen view="project" projectId={params.projectId} title={project?.name ?? "Project"} />;
}
