"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function ForgotPage() {
  const [url, setUrl] = useState("");
  const [done, setDone] = useState(false);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="font-display text-4xl">Reset password</h1>
      {done ? (
        <div className="mt-4 text-sm">
          <p>If that email is registered, a reset link is on its way.</p>
          {url && <a className="mt-2 block break-all underline" href={url}>{url}</a>}
        </div>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          const email = new FormData(event.currentTarget).get("email");
          const result = await api<{ resetUrl?: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
          setUrl(result.resetUrl ?? "");
          setDone(true);
        }}>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          <Button>Send reset link</Button>
        </form>
      )}
    </main>
  );
}
