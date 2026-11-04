"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { useWorkspace } from "./workspace";

type Message = { role: "user" | "assistant"; text: string; pending?: { title: string; priority?: number; dueAt?: string | null; assigneeIds?: string[]; labels?: string[]; recurrence?: null } };

export function Assistant({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { refresh, openTask } = useWorkspace();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask what is overdue, what someone finished this week, or tell me the task to create." },
  ]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(message: string) {
    setMessages((current) => [...current, { role: "user", text: message }]);
    setText("");
    setBusy(true);
    try {
      const result = await api<{ reply: string; pending: Message["pending"] }>("/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setMessages((current) => [...current, { role: "assistant", text: result.reply, pending: result.pending ?? undefined }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assistant unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function save(pending: NonNullable<Message["pending"]>) {
    const task = await api<TaskDTO>("/api/v1/tasks", { method: "POST", body: JSON.stringify(pending) });
    toast.success("Saved");
    await refresh();
    openTask(task.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] flex-col">
        <DialogTitle>Karm assistant</DialogTitle>
        <div className="mt-3 flex-1 space-y-3 overflow-auto pr-1" aria-live="polite">
          {messages.map((message, index) => (
            <div key={index} className={`rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "bg-[#1a1744] text-[#f6f1e8]" : "bg-secondary"}`}>
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.pending && (
                <Button className="mt-2" size="sm" onClick={() => save(message.pending!)}>Save “{message.pending.title}”</Button>
              )}
            </div>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) void send(text.trim());
          }}
        >
          <Textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="What is overdue for my team?" aria-label="Message the assistant" className="min-h-12" />
          <Button type="submit" disabled={busy}>Send</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
