"use client";

import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Command,
  FolderKanban,
  Inbox,
  Languages,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Shield,
  SunMedium,
  Sunrise,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { Mark, Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { Bootstrap } from "@/lib/dto";
import { translate, type Locale } from "@/lib/i18n";
import { isManager } from "@/lib/permissions";
import { Assistant } from "./assistant";
import { QuickAdd } from "./quick-add";
import { TaskDrawer } from "./task-drawer";

type WorkspaceValue = {
  data: Bootstrap;
  refresh: () => Promise<void>;
  openTask: (id: string | null) => void;
  taskId: string | null;
  openQuickAdd: () => void;
  locale: Locale;
  t: (key: string) => string;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace missing");
  return value;
}

const links = [
  { href: "/inbox", key: "nav.inbox", icon: Inbox },
  { href: "/today", key: "nav.today", icon: Sunrise },
  { href: "/upcoming", key: "nav.upcoming", icon: CalendarClock },
  { href: "/overdue", key: "nav.overdue", icon: CalendarClock },
  { href: "/completed", key: "nav.completed", icon: CheckCircle2 },
  { href: "/assigned", key: "nav.assigned", icon: UserRound },
];

export function WorkspaceProvider({ initial, children }: { initial: Bootstrap; children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskFromUrl = searchParams.get("task");
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [data, setData] = useState(initial);
  const [taskId, setTaskId] = useState<string | null>(taskFromUrl);
  const [trackedTask, setTrackedTask] = useState(taskFromUrl);
  const [quick, setQuick] = useState(false);
  const [ai, setAi] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  if (taskFromUrl !== trackedTask) {
    setTrackedTask(taskFromUrl);
    if (taskFromUrl) setTaskId(taskFromUrl);
  }
  const locale = (data.me.locale === "hi" ? "hi" : "en") as Locale;
  const t = (key: string) => translate(locale, key);

  async function refresh() {
    const next = await api<Bootstrap>("/api/v1/me");
    setData(next);
  }

  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type?: string; title?: string; body?: string };
      if (payload.type && payload.type !== "hello") {
        if (payload.title) toast(payload.title, { description: payload.body });
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && payload.title) {
          new Notification(payload.title, { body: payload.body });
        }
        void refresh();
      }
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette(true);
        return;
      }
      if (typing) return;
      if (event.key === "q") setQuick(true);
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("karm-search")?.focus();
      }
      if (event.key === "?") setHelp(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const unread = data.notifications.filter((item) => !item.readAt).length;
  const value: WorkspaceValue = { data, refresh, openTask: setTaskId, taskId, openQuickAdd: () => setQuick(true), locale, t };

  async function setLocale(next: Locale) {
    await api("/api/v1/me", { method: "PATCH", body: JSON.stringify({ locale: next }) });
    document.cookie = `karm_locale=${next}; path=/; max-age=31536000`;
    await refresh();
  }

  const nav = (
    <div className="flex h-full flex-col">
      <Link href="/today" className="flex items-center gap-2 px-4 py-5">
        <Mark />
        <Wordmark light />
      </Link>
      <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Workspace">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobile(false)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? "bg-white/10 text-white" : "text-[#f6f1e8]/75 hover:bg-white/5"}`}
            >
              <Icon className="h-4 w-4" />
              {t(link.key)}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#e8610a]" />}
            </Link>
          );
        })}
        <p className="mt-4 px-3 text-[11px] uppercase tracking-[0.16em] text-[#f6f1e8]/45">{t("nav.projects")}</p>
        {data.projects.filter((project) => !project.archivedAt).map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} onClick={() => setMobile(false)} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#f6f1e8]/80 hover:bg-white/5">
            <span className="h-2 w-2 rounded-full" style={{ background: project.color }} />
            <span className="truncate">{project.name}</span>
          </Link>
        ))}
        {isManager(data.me.role) && (
          <Link href="/admin/assign" className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#fdba74] hover:bg-white/5">
            <Shield className="h-4 w-4" /> {t("nav.admin")}
          </Link>
        )}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3">
        <div className="flex gap-1">
          <button className="flex-1 rounded-lg px-2 py-1.5 text-left text-xs text-[#f6f1e8]/80 hover:bg-white/5" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            {resolvedTheme === "dark" ? "Light" : "Dark"}
          </button>
          <button className="flex-1 rounded-lg px-2 py-1.5 text-left text-xs text-[#f6f1e8]/80 hover:bg-white/5" onClick={() => setLocale(locale === "en" ? "hi" : "en")}>
            {locale === "en" ? "हिन्दी" : "English"}
          </button>
        </div>
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[#f6f1e8]" onClick={() => router.push("/settings")}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e8610a] text-xs font-semibold text-white">{data.me.name.slice(0, 1)}</span>
          <span className="min-w-0">
            <span className="block truncate">{data.me.name}</span>
            <span className="block truncate text-[11px] text-[#f6f1e8]/50">{data.org.name}</span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <WorkspaceContext.Provider value={value}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-sidebar text-sidebar-foreground md:block">{nav}</aside>
        {mobile && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobile(false)} />
            <aside className="relative h-full w-72 bg-sidebar">{nav}</aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-3 py-2 backdrop-blur">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={() => setMobile(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <form
              className="relative min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/search?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="karm-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`${t("nav.search")}  /`} className="pl-9" aria-label={t("nav.search")} />
            </form>
            <Button variant="saffron" onClick={() => setQuick(true)}>
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t("action.quick")}</span>
            </Button>
            <Button variant="outline" size="icon" aria-label="Assistant" onClick={() => setAi(true)}>
              <Command className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label={resolvedTheme === "dark" ? "Light mode" : "Dark mode"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Language" onClick={() => setLocale(locale === "en" ? "hi" : "en")}>
              <Languages className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" onClick={() => router.push("/notifications")}>
              <Bell className="h-4 w-4" />
              {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e8610a]"><span className="sr-only">{unread} unread</span></span>}
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" aria-label="Command palette" onClick={() => setPalette(true)}>
              <Search className="h-4 w-4" />
            </Button>
          </header>
          <main className="flex-1 px-3 py-4 pb-24 md:px-6 md:pb-6">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card md:hidden" aria-label="Mobile">
            {[
              ["/today", "Today"],
              ["/inbox", "Inbox"],
              ["/assigned", "Mine"],
              ["/admin", "More"],
            ].map(([href, label]) => (
              <Link key={href} href={isManager(data.me.role) || href !== "/admin" ? (href === "/admin" ? "/admin/assign" : href) : "/settings"} className="flex-1 py-3 text-center text-xs">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <QuickAdd open={quick} onOpenChange={setQuick} />
      <Assistant open={ai} onOpenChange={setAi} />
      <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />
      <Dialog open={palette} onOpenChange={setPalette}>
        <DialogContent>
          <DialogTitle>Jump</DialogTitle>
          <div className="mt-3 grid gap-1">
            {[...links, { href: "/filters", key: "nav.filters", icon: FolderKanban }, { href: "/settings", key: "nav.search", icon: Search }].map((link) => (
              <button
                key={link.href}
                className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
                onClick={() => {
                  setPalette(false);
                  router.push(link.href);
                }}
              >
                {t(link.key)}
              </button>
            ))}
            <button className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => { setPalette(false); setQuick(true); }}>Quick add</button>
            <button className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </button>
            <button className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary" onClick={() => setLocale(locale === "en" ? "hi" : "en")}>
              <Languages className="mr-2 inline h-4 w-4" /> {locale === "en" ? "हिन्दी" : "English"}
            </button>
            <button
              className="rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 inline h-4 w-4" /> {t("action.signOut")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogTitle>Keyboard</DialogTitle>
          <ul className="mt-3 space-y-2 text-sm">
            <li><kbd>Q</kbd> quick add</li>
            <li><kbd>/</kbd> search</li>
            <li><kbd>Ctrl</kbd> or <kbd>⌘</kbd> + <kbd>K</kbd> jump</li>
            <li><kbd>?</kbd> this list</li>
            <li><kbd>Esc</kbd> close</li>
          </ul>
        </DialogContent>
      </Dialog>
    </WorkspaceContext.Provider>
  );
}
