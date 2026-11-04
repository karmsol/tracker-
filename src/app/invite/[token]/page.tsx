"use client";

import { useParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<{ email: string; organization: string; name: string | null } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<typeof preview>(`/api/invites/preview?token=${params.token}`).then(setPreview).catch(() => setError("This invite is no longer valid"));
  }, [params.token]);
  if (error) return <main className="p-10">{error}</main>;
  if (!preview) return <main className="p-10">Opening the invite…</main>;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="font-display text-4xl">Join {preview.organization}</h1>
      <p className="mt-2 text-sm text-muted-foreground">The invite is for {preview.email}.</p>
      <form className="mt-6 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const password = String(form.get("password"));
        try {
          await api("/api/invites/accept", { method: "POST", body: JSON.stringify({ token: params.token, name: form.get("name"), password }) });
          const result = await signIn("credentials", { email: preview.email, password, redirect: false });
          if (result?.error) router.push("/login");
          else router.push("/today");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not join");
        }
      }}>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" defaultValue={preview.name ?? ""} required />
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button>Join the workspace</Button>
      </form>
    </main>
  );
}
