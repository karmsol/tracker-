"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function ResetPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="font-display text-4xl">Choose a new password</h1>
      <form className="mt-6 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try {
          await api("/api/auth/reset", { method: "POST", body: JSON.stringify({ token: params.token, password: new FormData(event.currentTarget).get("password") }) });
          router.push("/login");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not reset");
        }
      }}>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button>Update password</Button>
      </form>
    </main>
  );
}
