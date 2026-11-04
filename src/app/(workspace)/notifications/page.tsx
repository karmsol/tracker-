"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { useWorkspace } from "@/components/workspace";

export default function NotificationsPage() {
  const { data, refresh } = useWorkspace();
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Notifications</h1>
        <Button variant="outline" onClick={async () => { await api("/api/v1/notifications", { method: "POST" }); await refresh(); }}>Mark read</Button>
      </div>
      <Button className="mt-3" variant="secondary" onClick={async () => {
        if (Notification.permission !== "granted") await Notification.requestPermission();
      }}>Allow browser alerts</Button>
      <ul className="mt-4 space-y-2">
        {data.notifications.length === 0 && <li className="text-sm text-muted-foreground">You are caught up.</li>}
        {data.notifications.map((item) => (
          <li key={item.id} className="rounded-xl border bg-card px-4 py-3">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.body}</p>
            {item.link && (
              <Link href={item.link} className="mt-2 inline-block text-sm font-medium text-[#e85d04] underline">
                {item.type === "pay.due" ? "Open payroll" : "Open"}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Button className="mt-4" variant="outline" onClick={async () => {
        const result = await api<{ narrative: string }>("/api/v1/ai/digest", { method: "POST" });
        alert(result.narrative);
      }}>Morning digest</Button>
    </div>
  );
}
