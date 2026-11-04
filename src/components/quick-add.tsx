"use client";

import { Mic, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { useWorkspace } from "./workspace";

type Draft = {
  title: string;
  dueAt: string | null;
  priority: number;
  assigneeIds: string[];
  projectId: string | null;
  projectName: string | null;
  labels: string[];
  reminder: boolean;
  note: string | null;
  recurrence: { frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"; interval: number; byWeekday: number[]; ordinal: number | null; customText: string | null } | null;
  recurrenceLabel: string | null;
  source?: string;
};

export function QuickAdd({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, refresh, openTask } = useWorkspace();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [listening, setListening] = useState(false);

  function reset() {
    setText("");
    setDraft(null);
    setManual(false);
    setTitle("");
  }

  async function preview() {
    setBusy(true);
    try {
      const result = await api<{ draft: Draft; source: string }>("/api/v1/ai/quick-add", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setDraft({ ...result.draft, source: result.source });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assistant is unavailable");
      setManual(true);
      setTitle(text);
    } finally {
      setBusy(false);
    }
  }

  async function save(next: { title: string; dueAt?: string | null; priority?: number; assigneeIds?: string[]; projectId?: string | null; labels?: string[]; reminder?: boolean; recurrence?: Draft["recurrence"] }) {
    setBusy(true);
    try {
      const task = await api<TaskDTO>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: next.title,
          dueAt: next.dueAt,
          priority: next.priority,
          assigneeIds: next.assigneeIds,
          projectId: next.projectId,
          labelNames: next.labels,
          remind: next.reminder,
          recurrence: next.recurrence,
        }),
      });
      toast.success("Task saved");
      await refresh();
      onOpenChange(false);
      reset();
      openTask(task.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  function listen() {
    type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
    type SpeechCtor = new () => {
      lang: string;
      start: () => void;
      onresult: ((event: SpeechResult) => void) | null;
      onerror: (() => void) | null;
    };
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const Ctor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("This browser has no speech recognition. Type the task instead.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = data.me.locale === "hi" ? "hi-IN" : "en-IN";
    recognition.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? "";
      setText(said);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogTitle>Capture the work</DialogTitle>
        <DialogDescription>English, Hindi, or Hinglish. You confirm before anything is saved.</DialogDescription>
        <div className="mt-3 flex gap-2 text-sm">
          <button className={!manual ? "font-medium text-[#c2410c]" : ""} onClick={() => setManual(false)}>Assistant</button>
          <button className={manual ? "font-medium text-[#c2410c]" : ""} onClick={() => setManual(true)}>Write it yourself</button>
        </div>
        {!manual && !draft && (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void preview();
            }}
          >
            <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder='Rahul ko kal shaam 5 baje tak client report bhejne ka task do, high priority' aria-label="Describe the task" />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy || text.trim().length < 2}>{busy ? "Reading…" : "Preview"}</Button>
              <Button type="button" variant="outline" onClick={listen} aria-label="Voice input">
                <Mic className={`h-4 w-4 ${listening ? "text-[#c2410c]" : ""}`} />
              </Button>
            </div>
          </form>
        )}
        {draft && (
          <form
            className="mt-4 space-y-3 rounded-xl border bg-secondary/40 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save(draft);
            }}
          >
            <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3 w-3" /> {draft.source === "claude" ? "Claude" : "Built-in parser"}</p>
            <Label>Title</Label>
            <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Priority
                <select className="mt-1 h-10 w-full rounded-lg border bg-card px-2" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}>
                  <option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option><option value={4}>P4</option>
                </select>
              </label>
              <label className="text-sm">Due
                <Input type="datetime-local" value={draft.dueAt ? draft.dueAt.slice(0, 16) : ""} onChange={(event) => setDraft({ ...draft, dueAt: event.target.value ? new Date(event.target.value).toISOString() : null })} />
              </label>
            </div>
            <p className="text-sm">People: {draft.assigneeIds.map((id) => data.members.find((member) => member.id === id)?.name).filter(Boolean).join(", ") || "You"}</p>
            <p className="text-sm">Project: {draft.projectName || "Inbox"} {draft.recurrenceLabel ? `· ${draft.recurrenceLabel}` : ""}</p>
            {draft.labels.length > 0 && <p className="text-sm">Labels: {draft.labels.join(", ")}</p>}
            {draft.note && <p className="text-sm text-[#9a3412]">{draft.note}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>Save task</Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>Edit sentence</Button>
            </div>
          </form>
        )}
        {manual && (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void save({ title, assigneeIds: [data.me.id], priority: 4 });
            }}
          >
            <Label htmlFor="manual-title">Title</Label>
            <Input id="manual-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            <Button type="submit" disabled={busy}>Save task</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
