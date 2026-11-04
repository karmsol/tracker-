"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="font-display text-4xl">Create the workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">You become the super admin. Invite the rest after you are in.</p>
      {verifyUrl ? (
        <div className="mt-6 space-y-3 text-sm">
          <p>Confirm your email, then sign in.</p>
          <a className="break-all underline" href={verifyUrl}>{verifyUrl}</a>
          <Link className="block" href="/login">Go to sign in</Link>
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
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required />
          <Label htmlFor="organization">Workspace name</Label>
          <Input id="organization" name="organization" required />
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button disabled={busy} className="w-full">{busy ? "Creating…" : "Create workspace"}</Button>
          <p className="text-sm"><Link href="/login">I already have an account</Link></p>
        </form>
      )}
    </main>
  );
}
