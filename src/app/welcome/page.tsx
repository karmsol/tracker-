"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";

export default function WelcomePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="font-display text-4xl">Name the workspace</h1>
      <form className="mt-6 space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api("/api/auth/workspace", { method: "POST", body: JSON.stringify({ organization: new FormData(event.currentTarget).get("organization") }) });
          router.push("/today");
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not create it");
        }
      }}>
        <Label htmlFor="organization">Workspace</Label>
        <Input id="organization" name="organization" required />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button>Continue</Button>
      </form>
    </main>
  );
}
