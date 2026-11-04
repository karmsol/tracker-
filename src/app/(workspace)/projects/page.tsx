"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { useWorkspace } from "@/components/workspace";

export default function ProjectsPage() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const manager = data.me.role !== "EMPLOYEE";
  return (
    <div>
      <h1 className="font-display text-4xl">Projects</h1>
      {manager && (
        <form className="mt-4 flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/v1/projects", { method: "POST", body: JSON.stringify({ name }) }); setName(""); await refresh(); }}>
          <Input value={name} onChange={(event) => setName(event.target.value)} aria-label="Project name" placeholder="New project" required />
          <Button>Create</Button>
        </form>
      )}
      <ul className="mt-4 space-y-2">
        {data.projects.filter((project) => !project.archivedAt).map((project) => (
          <li key={project.id}><Link className="block rounded-xl border bg-card px-4 py-3" href={`/projects/${project.id}`}>{project.name}</Link></li>
        ))}
      </ul>
    </div>
  );
}
