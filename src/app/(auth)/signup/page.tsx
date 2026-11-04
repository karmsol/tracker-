"use client";

import Link from "next/link";
import { useState } from "react";
import { Mark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="relative flex min-h-dvh items-center justify-center karm-atmosphere p-6">
      <div className="absolute inset-0 karm-grain" aria-hidden />
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-white/90 p-6 shadow-[0_20px_50px_-30px_rgb(16_16_31/0.35)] backdrop-blur">
        <div className="mb-5 flex items-center gap-2.5">
          <Mark />
          <Wordmark />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-balance">Create the workspace</h1>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          You become the super admin. Invite the rest after you are in.
        </p>
        {verifyUrl ? (
          <div className="mt-6 space-y-3 text-sm">
            <p>Confirm your email, then sign in.</p>
            <a className="break-all font-medium underline underline-offset-4" href={verifyUrl}>
              {verifyUrl}
            </a>
            <Link className="block font-medium underline-offset-4 hover:underline" href="/login">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(event.currentTarget);
              try {
                const result = await api<{ verifyUrl?: string }>("/api/auth/signup", {
                  method: "POST",
                  body: JSON.stringify({
                    name: form.get("name"),
                    email: form.get("email"),
                    password: form.get("password"),
                    organization: form.get("organization"),
                  }),
                });
                setVerifyUrl(result.verifyUrl || "/login?check=email");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not create the workspace");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organization">Workspace name</Label>
              <Input id="organization" name="organization" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button disabled={busy} className="w-full">
              {busy ? "Creating…" : "Create workspace"}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
                I already have an account
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
