"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { Mark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const demos = [
  ["Aanya Sharma", "aanya.sharma@karmkaro.dev", "Super admin"],
  ["Arjun Mehta", "arjun.mehta@karmkaro.dev", "Admin"],
  ["Rahul Verma", "rahul.verma@karmkaro.dev", "Employee"],
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(params.get("verified") ? "" : "");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (result?.error) {
      const code = (result as { code?: string }).code;
      setError(code === "locked" ? "This account is locked for 15 minutes." : code === "unverified" ? "Verify your email first." : "Those details did not match.");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="hidden bg-[#1a1744] p-10 text-[#f6f1e8] md:block">
        <Mark />
        <h1 className="mt-10 font-display text-5xl">Sign in and pick up the thread.</h1>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <Wordmark />
          <h2 className="font-display text-3xl">Sign in</h2>
          {params.get("verified") && <p className="text-sm text-[#0f766e]">Email confirmed. You can sign in.</p>}
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          {process.env.NEXT_PUBLIC_DEMO === "1" && (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Demo password: KarmKaro#2026</p>
              {demos.map(([name, mail, role]) => (
                <button type="button" key={mail} className="block text-left underline" onClick={() => { setEmail(mail); setPassword("KarmKaro#2026"); }}>
                  {name} · {role}
                </button>
              ))}
            </div>
          )}
          <p className="text-sm"><Link className="underline" href="/forgot">Forgot password</Link> · <Link className="underline" href="/signup">Create a workspace</Link></p>
          {process.env.NEXT_PUBLIC_GOOGLE === "1" && <Button type="button" variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: "/today" })}>Continue with Google</Button>}
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
