import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Mark, Wordmark } from "@/components/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) redirect("/today");

  return (
    <main className="relative min-h-dvh overflow-hidden karm-atmosphere">
      <div className="absolute inset-0 karm-grain" aria-hidden />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2.5 karm-rise">
          <Mark />
          <Wordmark />
        </span>
        <nav className="flex items-center gap-2 text-sm karm-rise karm-rise-delay-1">
          <Link
            className="rounded-lg px-3 py-2 font-medium text-foreground/70 transition-colors duration-150 hover:bg-black/5 hover:text-foreground"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-lg bg-[#10101f] px-3.5 py-2 font-semibold text-[#f4f3ef] transition-colors duration-150 hover:bg-[#1c1a36]"
            href="/signup"
          >
            Create workspace
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100dvh-5.5rem)] max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-20">
        <div className="max-w-xl">
          <p className="karm-rise text-sm font-semibold uppercase tracking-[0.2em] text-[#e85d04]">काम करो</p>
          <h1 className="karm-rise karm-rise-delay-1 mt-4 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-balance text-[#10101f] md:text-6xl lg:text-7xl">
            Karm Karo
          </h1>
          <p className="karm-rise karm-rise-delay-2 mt-5 max-w-md text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Capture work in Hindi, Hinglish, or English. Assign it once. See who is carrying too much.
          </p>
          <div className="karm-rise karm-rise-delay-3 mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-12 items-center rounded-xl bg-[#e85d04] px-6 text-[15px] font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#cf4f03]"
              href="/signup"
            >
              Start a workspace
            </Link>
            <Link
              className="inline-flex h-12 items-center rounded-xl border border-border bg-white/80 px-6 text-[15px] font-semibold text-foreground backdrop-blur transition-colors duration-150 hover:bg-white"
              href="/login"
            >
              Open the demo
            </Link>
          </div>
        </div>

        <div className="relative karm-rise karm-rise-delay-2 karm-float">
          <div className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgb(232_93_4/0.18),transparent_55%)] blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/40 bg-[#10101f] shadow-[0_30px_80px_-28px_rgb(16_16_31/0.55)]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-[#e85d04]" />
              <span className="ml-3 text-xs font-medium text-white/50">Today · Indus Collective</span>
            </div>
            <div className="grid md:grid-cols-[11rem_1fr]">
              <aside className="hidden border-r border-white/10 p-4 md:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Desk</p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/70">
                  {["Inbox", "Today", "My work", "Payrolls"].map((item, index) => (
                    <li
                      key={item}
                      className={`rounded-lg px-2.5 py-1.5 ${index === 1 ? "bg-white/10 text-white" : ""}`}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </aside>
              <div className="space-y-3 p-4 md:p-5">
                {[
                  ["P1", "Send the client report", "Rahul · tomorrow 5pm", true],
                  ["P2", "Review invoices", "Every Monday", false],
                  ["P3", "Cut the marigold reel", "Priya · in review", false],
                ].map(([priority, title, meta, active]) => (
                  <div
                    key={String(title)}
                    className={`rounded-xl border px-4 py-3 transition-colors duration-150 ${
                      active ? "border-[#e85d04]/40 bg-white/[0.07]" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff8a3d]">{priority as string}</p>
                    <p className="mt-1 font-semibold text-white">{title as string}</p>
                    <p className="mt-0.5 text-sm text-white/50">{meta as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
