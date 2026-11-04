"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { formatInZone } from "@/lib/zoned";
import { useWorkspace } from "./workspace";

type Detail = {
  task: TaskDTO;
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
  children: TaskDTO[];
  attachments: { id: string; filename: string; size: number }[];
  activity: { id: string; action: string; createdAt: string; actor: string }[];
};

export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { data, refresh, openTask } = useWorkspace();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [comment, setComment] = useState("");
  const [check, setCheck] = useState("");
  const [subtask, setSubtask] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState<number | null>(null);

  async function load(id: string) {
    try {
      setDetail(await api<Detail>(`/api/v1/tasks/${id}`));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the task");
    }
  }

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    api<Detail>(`/api/v1/tasks/${taskId}`)
      .then((next) => {
        if (cancelled) return;
        setDetail(next);
        setError("");
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open the task");
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function patch(body: Record<string, unknown>) {
    if (!taskId) return;
    await api(`/api/v1/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(body) });
    await load(taskId);
    await refresh();
  }

  if (!taskId) return null;
  const shown = detail?.task.id === taskId ? detail : null;
  const task = shown?.task;
  const locale = data.me.locale === "hi" ? "hi-IN" : "en-IN";

  return (
    <Dialog open={Boolean(taskId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[min(760px,calc(100%-1rem))] overflow-auto">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!task && !error && <p className="text-sm text-muted-foreground">Opening the task…</p>}
        {task && (
          <div className="space-y-4">
            <DialogTitle className="sr-only">Task</DialogTitle>
            <Input aria-label="Title" value={task.title} onChange={(event) => setDetail({ ...detail!, task: { ...task, title: event.target.value } })} onBlur={() => patch({ title: task.title })} className="font-display text-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Status
                <select className="mt-1 h-10 w-full rounded-lg border bg-card px-2" value={task.status} onChange={(event) => patch({ status: event.target.value })}>
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="IN_REVIEW">In review</option>
                  <option value="DONE">Done</option>
                </select>
              </label>
              <label className="text-sm">Priority
                <select className="mt-1 h-10 w-full rounded-lg border bg-card px-2" value={task.priority} onChange={(event) => patch({ priority: Number(event.target.value) })}>
                  <option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option><option value={4}>P4</option>
                </select>
              </label>
              <label className="text-sm">Due
                <Input type="datetime-local" defaultValue={task.dueAt?.slice(0, 16) ?? ""} onBlur={(event) => patch({ dueAt: event.target.value ? new Date(event.target.value).toISOString() : null })} />
              </label>
              <label className="text-sm">Start
                <Input type="datetime-local" defaultValue={task.startAt?.slice(0, 16) ?? ""} onBlur={(event) => patch({ startAt: event.target.value ? new Date(event.target.value).toISOString() : null })} />
              </label>
              <label className="text-sm">Estimate (minutes)
                <Input type="number" defaultValue={task.estimateMinutes ?? ""} onBlur={(event) => patch({ estimateMinutes: event.target.value ? Number(event.target.value) : null })} />
              </label>
              <label className="text-sm">Project
                <select className="mt-1 h-10 w-full rounded-lg border bg-card px-2" value={task.projectId ?? ""} onChange={(event) => patch({ projectId: event.target.value || null })}>
                  <option value="">Inbox</option>
                  {data.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm">Assignees
              <select multiple className="mt-1 min-h-24 w-full rounded-lg border bg-card p-2" value={task.assigneeIds} onChange={(event) => patch({ assigneeIds: [...event.target.selectedOptions].map((option) => option.value) })}>
                {data.members.filter((member) => member.active).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <Textarea aria-label="Description" defaultValue={task.description ?? ""} placeholder="Add context. Markdown is fine." onBlur={(event) => patch({ description: event.target.value })} />
            <div className="flex flex-wrap gap-2 text-sm">
              <span>{task.trackedMinutes} min tracked</span>
              <Button size="sm" variant="outline" onClick={() => setRunning(Date.now())} disabled={running !== null}>Start timer</Button>
              <Button size="sm" variant="outline" disabled={running === null} onClick={() => {
                const minutes = Math.max(1, Math.round((Date.now() - (running ?? Date.now())) / 60000));
                setRunning(null);
                void patch({ trackedMinutes: minutes });
              }}>Stop</Button>
              {task.dueAt && <span>Due {formatInZone(task.dueAt, data.org.timezone, locale)}</span>}
              {task.recurrence && <span>Repeats {task.recurrence.frequency.toLowerCase()}</span>}
            </div>
            <section>
              <h3 className="font-medium">Checklist</h3>
              {task.checklist.map((item) => (
                <label key={item.id} className="mt-1 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={item.done} onChange={(event) => api(`/api/v1/tasks/${task.id}/checklist/${item.id}`, { method: "PATCH", body: JSON.stringify({ done: event.target.checked }) }).then(() => load(task.id))} />
                  {item.title}
                </label>
              ))}
              <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); api(`/api/v1/tasks/${task.id}/checklist`, { method: "POST", body: JSON.stringify({ title: check }) }).then(() => { setCheck(""); return load(task.id); }); }}>
                <Input value={check} onChange={(event) => setCheck(event.target.value)} placeholder="Add a step" aria-label="Checklist item" />
                <Button type="submit" variant="outline">Add</Button>
              </form>
            </section>
            <section>
              <h3 className="font-medium">Subtasks</h3>
              {shown?.children.map((child) => (
                <button key={child.id} className="mt-1 block text-sm underline" onClick={() => openTask(child.id)}>{child.title}</button>
              ))}
              <form className="mt-2 flex gap-2" onSubmit={async (event) => { event.preventDefault(); const created = await api<TaskDTO>("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title: subtask, parentId: task.id, projectId: task.projectId, assigneeIds: task.assigneeIds }) }); setSubtask(""); toast.success("Subtask added"); await load(task.id); void created; }}>
                <Input value={subtask} onChange={(event) => setSubtask(event.target.value)} placeholder="Break off a piece" aria-label="Subtask" />
                <Button type="submit" variant="outline">Add</Button>
              </form>
              <Button className="mt-2" size="sm" variant="secondary" onClick={async () => {
                const result = await api<{ subtasks: { title: string; estimateMinutes: number }[] }>("/api/v1/ai/breakdown", { method: "POST", body: JSON.stringify({ taskId: task.id }) });
                for (const item of result.subtasks) {
                  await api("/api/v1/tasks", { method: "POST", body: JSON.stringify({ title: item.title, parentId: task.id, projectId: task.projectId, estimateMinutes: item.estimateMinutes, assigneeIds: [data.me.id] }) });
                }
                toast.success("Subtasks added");
                await load(task.id);
              }}>Suggest subtasks</Button>
              {data.me.role !== "EMPLOYEE" && (
                <Button className="ml-2 mt-2" size="sm" variant="outline" onClick={async () => {
                  const result = await api<{ suggestion: { name: string; why: string; userId: string } | null }>("/api/v1/ai/assign", { method: "POST", body: JSON.stringify({ taskId: task.id }) });
                  if (!result.suggestion) return;
                  if (confirm(`${result.suggestion.name}: ${result.suggestion.why}\n\nAssign them?`)) {
                    await patch({ assigneeIds: [result.suggestion.userId] });
                  }
                }}>Suggest assignee</Button>
              )}
            </section>
            <section>
              <h3 className="font-medium">Files</h3>
              {shown?.attachments.map((file) => <a key={file.id} className="block text-sm underline" href={`/api/files/${file.id}`}>{file.filename}</a>)}
              <input className="mt-2 text-sm" type="file" aria-label="Attach a file" onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const body = new FormData();
                body.set("taskId", task.id);
                body.set("file", file);
                await api("/api/uploads", { method: "POST", body });
                await load(task.id);
              }} />
            </section>
            <section>
              <h3 className="font-medium">Comments</h3>
              {shown?.comments.map((item) => (
                <p key={item.id} className="mt-2 text-sm"><strong>{item.author.name}</strong> · {formatInZone(item.createdAt, data.org.timezone, locale)}<br />{item.body}</p>
              ))}
              <form className="mt-2 flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api(`/api/v1/tasks/${task.id}/comments`, { method: "POST", body: JSON.stringify({ body: comment }) }); setComment(""); await load(task.id); }}>
                <Input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="@Priya can you look?" aria-label="Comment" />
                <Button type="submit">Send</Button>
              </form>
            </section>
            <section>
              <h3 className="font-medium">Activity</h3>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {shown?.activity.map((item) => <li key={item.id}>{item.actor} · {item.action.replaceAll(".", " ")} · {formatInZone(item.createdAt, data.org.timezone, locale)}</li>)}
              </ul>
            </section>
            <Button variant="destructive" onClick={async () => { if (!confirm("Delete this task?")) return; await api(`/api/v1/tasks/${task.id}`, { method: "DELETE" }); toast.success("Deleted"); onClose(); await refresh(); }}>Delete</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
