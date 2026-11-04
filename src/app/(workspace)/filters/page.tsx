"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { TaskScreen } from "@/components/task-screen";
import { useWorkspace } from "@/components/workspace";

export default function FiltersPage() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("priority:P1 AND assignee:me AND due:this week");
  const [active, setActive] = useState("");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Saved filters</h1>
      <form className="flex flex-wrap gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/v1/filters", { method: "POST", body: JSON.stringify({ name, query }) }); setName(""); await refresh(); }}>
        <Input aria-label="Filter name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input aria-label="Filter query" className="min-w-72" value={query} onChange={(event) => setQuery(event.target.value)} required />
        <Button>Save</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {data.filters.map((filter) => (
          <button key={filter.id} className="rounded-full border px-3 py-1 text-sm" onClick={() => setActive(filter.query)}>{filter.name}</button>
        ))}
      </div>
      {active && <TaskScreen view="search" title={active} filter={active} />}
    </div>
  );
}
