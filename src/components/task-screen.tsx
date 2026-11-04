"use client";

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { formatDay, getZonedParts } from "@/lib/zoned";
import { useWorkspace } from "./workspace";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

export function TaskScreen({
  view,
  projectId,
  title,
  filter,
}: {
  view: string;
  projectId?: string;
  title: string;
  filter?: string;
}) {
  const { data, openTask, t } = useWorkspace();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "board" | "calendar" | "timeline">("list");
  const [picked, setPicked] = useState<string[]>([]);
  const [sectionMode, setSectionMode] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const project = data.projects.find((item) => item.id === projectId);

  function taskQuery() {
    const params = new URLSearchParams({ view });
    if (projectId) params.set("projectId", projectId);
    if (filter) params.set("filter", filter);
    return params.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const rows = await api<TaskDTO[]>(`/api/v1/tasks?${taskQuery()}`);
      setTasks(rows);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api<TaskDTO[]>(`/api/v1/tasks?${taskQuery()}`)
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load tasks");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // taskQuery is derived from the listed dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, projectId, filter]);

  const roots = tasks.filter((task) => !task.parentId || !tasks.some((other) => other.id === task.parentId));

  async function move(id: string, status: TaskDTO["status"]) {
    const previous = tasks;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
    try {
      await api(`/api/v1/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (err) {
      setTasks(previous);
      toast.error(err instanceof Error ? err.message : "Could not update");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const status = String(event.over?.id ?? "");
    if (STATUSES.includes(status as TaskDTO["status"])) void move(String(event.active.id), status as TaskDTO["status"]);
  }

  async function bulk(patch: Record<string, unknown>) {
    await api("/api/v1/tasks/bulk", { method: "POST", body: JSON.stringify({ ids: picked, ...patch }) });
    setPicked([]);
    toast.success("Updated");
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#e85d04]">{data.org.name}</p>
          <h1 className="font-display text-4xl">{title}</h1>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="View">
          {(["list", "board", "calendar", "timeline"] as const).map((item) => (
            <Button key={item} size="sm" variant={mode === item ? "default" : "outline"} onClick={() => setMode(item)} role="tab" aria-selected={mode === item}>
              {item}
            </Button>
          ))}
          {project && <Button size="sm" variant={sectionMode ? "default" : "outline"} onClick={() => setSectionMode((value) => !value)}>Sections</Button>}
        </div>
      </div>
      {view === "today" && !data.me.onboardingDone && (data.me.role === "ADMIN" || data.me.role === "SUPER_ADMIN") && <Onboarding />}
      {picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 text-sm">
          <span>{picked.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulk({ priority: 1 })}>P1</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ status: "IN_PROGRESS" })}>Start</Button>
          <Button size="sm" variant="outline" onClick={() => bulk({ status: "DONE" })}>Done</Button>
          <Button size="sm" variant="destructive" onClick={() => confirm("Delete the selected tasks?") && bulk({ deleted: true })}>Delete</Button>
        </div>
      )}
      {loading && <div className="space-y-2" aria-busy="true">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-secondary" />)}</div>}
      {error && <p className="rounded-xl border border-destructive/30 bg-card p-4 text-sm">{error} <button className="underline" onClick={() => load()}>Retry</button></p>}
      {!loading && !error && roots.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <p className="font-display text-2xl">{t("empty.tasks")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("empty.hint")}</p>
        </div>
      )}
      {!loading && !error && mode === "list" && (
        <ul className="space-y-2">
          {roots.map((task) => (
            <li key={task.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3">
              <input type="checkbox" aria-label={`Select ${task.title}`} checked={picked.includes(task.id)} onChange={(event) => setPicked((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} />
              <button className="h-5 w-5 rounded-full border-2" style={{ borderColor: priorityColor(task.priority) }} aria-label={`Mark ${task.title}`} onClick={() => move(task.id, task.status === "DONE" ? "TODO" : "DONE")} />
              <button className="min-w-0 flex-1 text-left" onClick={() => openTask(task.id)}>
                <span className={`block truncate ${task.status === "DONE" ? "text-muted-foreground line-through" : ""}`}>{task.title}</span>
                <span className="text-xs text-muted-foreground">
                  P{task.priority}
                  {task.dueAt ? ` · ${formatDay(task.dueAt, data.org.timezone, data.me.locale === "hi" ? "hi-IN" : "en-IN")}` : ""}
                  {task.labels.map((label) => ` · ${label.name}`).join("")}
                  {task.subtaskCount ? ` · ${task.subtaskCount} sub` : ""}
                </span>
              </button>
              <span className="hidden text-xs text-muted-foreground sm:inline">{names(task, data.members)}</span>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && mode === "board" && (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-3 md:grid-cols-4">
            {(sectionMode && project ? project.sections.map((section) => section.name) : ["To do", "In progress", "In review", "Done"]).map((label, index) => {
              const status = STATUSES[index] ?? "TODO";
              const column = sectionMode && project
                ? roots.filter((task) => task.sectionId === project.sections[index]?.id)
                : roots.filter((task) => task.status === status);
              return <Column key={label} id={sectionMode ? `section-${index}` : status} title={label} tasks={column} onOpen={openTask} />;
            })}
          </div>
        </DndContext>
      )}
      {!loading && !error && mode === "calendar" && <Calendar tasks={roots} timeZone={data.org.timezone} onOpen={openTask} />}
      {!loading && !error && mode === "timeline" && <Timeline tasks={roots} timeZone={data.org.timezone} onOpen={openTask} />}
    </div>
  );
}

function Column({ id, title, tasks, onOpen }: { id: string; title: string; tasks: TaskDTO[]; onOpen: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`rounded-2xl bg-secondary/70 p-2 ${isOver ? "ring-2 ring-[#e85d04]" : ""}`}>
      <h2 className="px-2 py-2 text-sm font-medium">{title} <span className="text-muted-foreground">{tasks.length}</span></h2>
      <div className="space-y-2">
        {tasks.map((task) => <Card key={task.id} task={task} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

function Card({ task, onOpen }: { task: TaskDTO; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: task.id });
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} onClick={() => onOpen(task.id)} className="block w-full rounded-xl border bg-card p-3 text-left text-sm shadow-sm">
      <span className="mb-1 block h-1 w-8 rounded-full" style={{ background: priorityColor(task.priority) }} />
      {task.title}
    </button>
  );
}

function Calendar({ tasks, timeZone, onOpen }: { tasks: TaskDTO[]; timeZone: string; onOpen: (id: string) => void }) {
  const today = getZonedParts(new Date(), timeZone);
  const firstUtc = new Date(Date.UTC(today.year, today.month - 1, 1));
  const first = firstUtc.getUTCDay();
  const days = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
  const cells = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, index) => index + 1)];
  return (
    <div className="grid grid-cols-7 gap-1">
      {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => <div key={`${label}-${index}`} className="p-2 text-center text-xs text-muted-foreground">{label}</div>)}
      {cells.map((day, index) => {
        const dated = tasks.filter((task) => {
          if (!task.dueAt || day == null) return false;
          const parts = getZonedParts(new Date(task.dueAt), timeZone);
          return parts.day === day && parts.month === today.month && parts.year === today.year;
        });
        return (
          <div key={index} className="min-h-20 rounded-lg border bg-card p-1 text-xs">
            {day}
            {dated.map((task) => <button key={task.id} className="mt-1 block w-full truncate rounded bg-secondary px-1 text-left" onClick={() => onOpen(task.id)}>{task.title}</button>)}
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ tasks, timeZone, onOpen }: { tasks: TaskDTO[]; timeZone: string; onOpen: (id: string) => void }) {
  const scheduled = tasks.filter((task) => task.dueAt || task.startAt);
  if (!scheduled.length) return <p className="text-sm text-muted-foreground">Nothing is scheduled in this view.</p>;
  const times = scheduled.flatMap((task) => [task.startAt, task.dueAt].filter((value): value is string => Boolean(value)).map((value) => new Date(value).getTime()));
  const min = Math.min(...times);
  const max = Math.max(...times);
  const start = min - 86_400_000;
  const span = Math.max(max - min + 2 * 86_400_000, 86_400_000);
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{formatDay(new Date(min).toISOString(), timeZone)} – {formatDay(new Date(max).toISOString(), timeZone)}</p>
      {scheduled.map((task) => {
        const from = new Date(task.startAt || task.dueAt || min).getTime();
        const to = new Date(task.dueAt || task.startAt || min).getTime();
        const left = Math.min(100, Math.max(0, ((from - start) / span) * 100));
        const width = Math.min(100 - left, Math.max(8, ((Math.max(to, from) - from) / span) * 100 + 8));
        return (
          <button key={task.id} onClick={() => onOpen(task.id)} className="relative block h-10 w-full overflow-hidden rounded-lg bg-secondary text-left">
            <span className="absolute top-1 h-8 truncate rounded-md bg-[#10101f] px-2 text-xs leading-8 text-[#f4f3ef]" style={{ left: `${left}%`, width: `${width}%` }}>{task.title}</span>
          </button>
        );
      })}
    </div>
  );
}

function Onboarding() {
  const { data, refresh } = useWorkspace();
  const steps = [
    { id: "project", label: "Create a project", done: data.projects.length > 0 },
    { id: "people", label: "Invite a teammate", done: data.members.length > 1 },
    { id: "ai", label: "Try quick add in Hindi or Hinglish", done: false },
  ];
  if (steps.every((step) => step.done)) return null;
  return (
    <section className="mb-4 rounded-2xl border bg-card p-4">
      <h2 className="font-display text-2xl">First hour as a manager</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {steps.map((step) => <li key={step.id}>{step.done ? "✓" : "○"} {step.label}</li>)}
      </ul>
      <Button className="mt-3" size="sm" variant="outline" onClick={async () => { await api("/api/v1/me", { method: "PATCH", body: JSON.stringify({ onboardingDone: true }) }); await refresh(); }}>Hide checklist</Button>
    </section>
  );
}

function names(task: TaskDTO, members: { id: string; name: string }[]) {
  return task.assigneeIds.map((id) => members.find((member) => member.id === id)?.name.split(" ")[0]).filter(Boolean).join(", ");
}

function priorityColor(priority: number) {
  return ["#9f1239", "#e85d04", "#2a2760", "#a8a29e"][priority - 1] ?? "#a8a29e";
}

void useMemo;
