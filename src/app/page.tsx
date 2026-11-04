import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Mark, Wordmark } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect("/today");
  return (
    <main className="karm-grid min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="flex items-center gap-2"><Mark /><Wordmark /></span>
        <nav className="flex gap-2 text-sm">
          <Link className="rounded-lg px-3 py-2" href="/login">Sign in</Link>
          <Link className="rounded-lg bg-[#1a1744] px-3 py-2 text-[#f6f1e8]" href="/signup">Create a workspace</Link>
        </nav>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[#c2410c]">काम करो</p>
          <h1 className="mt-3 font-display text-5xl leading-tight md:text-7xl">The work, clearly assigned.</h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Karm Karo is the desk a manager actually uses. Capture a task in Hindi, Hinglish, or English, hand it to the right person, and see who is carrying too much.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-[#c2410c] px-5 py-3 text-white" href="/signup">Start a workspace</Link>
            <Link className="rounded-xl border bg-card px-5 py-3" href="/login">Open the demo</Link>
          </div>
        </div>
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Today · Indus Collective</p>
          <ul className="mt-4 space-y-3">
            {[
              ["P1", "Send the client report", "Rahul · tomorrow 5pm"],
              ["P2", "Review invoices", "Every Monday"],
              ["P3", "Cut the marigold reel", "Priya · in review"],
            ].map(([priority, title, meta]) => (
              <li key={title} className="rounded-2xl border px-4 py-3">
                <span className="text-xs text-[#c2410c]">{priority}</span>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{meta}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
