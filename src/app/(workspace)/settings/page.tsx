"use client";

import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { useWorkspace } from "@/components/workspace";

export default function SettingsPage() {
  const { data, refresh } = useWorkspace();
  const { setTheme } = useTheme();
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="font-display text-4xl">Your settings</h1>
      <p>{data.me.name} · {data.me.email}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setTheme("light")}>Light</Button>
        <Button variant="outline" onClick={() => setTheme("dark")}>Dark</Button>
        <Button variant="outline" onClick={async () => { await api("/api/v1/me", { method: "PATCH", body: JSON.stringify({ locale: data.me.locale === "hi" ? "en" : "hi" }) }); document.cookie = `karm_locale=${data.me.locale === "hi" ? "en" : "hi"}; path=/`; await refresh(); }}>{data.me.locale === "hi" ? "English" : "हिन्दी"}</Button>
      </div>
      <Button variant="destructive" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>
    </div>
  );
}
