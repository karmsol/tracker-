"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { zonedTimeToUtc } from "@/lib/zoned";
import { useWorkspace } from "./workspace";

const PRIORITIES = [
  { value: 1, label: "Urgent", tone: "border-[#b91c1c] text-[#b91c1c]" },
  { value: 2, label: "High", tone: "border-[#c2410c] text-[#c2410c]" },
  { value: 3, label: "Normal", tone: "border-[#1a1744] text-[#1a1744]" },
  { value: 4, label: "Later", tone: "border-stone-400 text-stone-500" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const primary = [
    ["/admin/assign", "Give work"],
    ["/admin", "Team"],
    ["/admin/pay", "Payrolls"],
    ["/admin/people", "People"],
  ] as const;
  const more = [
    ["/admin/workload", "Workload"],
    ["/admin/projects", "Projects"],
    ["/admin/reports", "Reports"],
    ["/admin/audit", "Audit"],
    ["/admin/settings", "Settings"],
  ] as const;
  const moreOpen = more.some(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  return (
    <div className="space-y-2">
      <nav className="flex flex-wrap gap-2" aria-label="Manager">
        {primary.map(([href, label]) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-full px-4 py-2 text-sm ${active ? "bg-[#1a1744] text-[#f6f1e8]" : "border bg-card hover:bg-secondary"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <details className="rounded-2xl border bg-card px-4 py-2" open={moreOpen}>
        <summary className="cursor-pointer text-sm text-muted-foreground">More manager tools</summary>
        <nav className="mt-2 flex flex-wrap gap-2 pb-1" aria-label="More manager tools">
          {more.map(([href, label]) => (
            <Link key={href} href={href} className={`rounded-full border px-3 py-1 text-sm ${pathname === href ? "border-[#1a1744] bg-[#1a1744] text-[#f6f1e8]" : "bg-background"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </details>
    </div>
  );
}

function ManagerShell({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">{eyebrow}</p>
        <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
        {hint && <p className="max-w-2xl text-sm text-muted-foreground">{hint}</p>}
      </header>
      <AdminNav />
      {children}
    </div>
  );
}

export function AdminHome() {
  const { data } = useWorkspace();
  const router = useRouter();
  const [stats, setStats] = useState<{
    totals: { open: number; overdue: number; done: number };
    perEmployee: { id: string; name: string; open: number; overdue: number }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{
      totals: { open: number; overdue: number; done: number };
      perEmployee: { id: string; name: string; open: number; overdue: number }[];
    }>("/api/v1/admin/dashboard")
      .then((next) => {
        if (!cancelled) setStats(next);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load the team desk"));
    return () => {
      cancelled = true;
    };
  }, []);

  const team = useMemo(() => {
    const people = data.members.filter((member) => member.active && member.role === "EMPLOYEE");
    return people.map((member) => {
      const row = stats?.perEmployee.find((item) => item.id === member.id);
      return { ...member, open: row?.open ?? 0, overdue: row?.overdue ?? 0 };
    });
  }, [data.members, stats]);

  return (
    <ManagerShell
      eyebrow="Manager desk"
      title="Give work. Keep it light."
      hint="This desk is only for handing work to people. Charts and settings stay tucked under More."
    >
      <section className="rounded-[1.75rem] border bg-[#1a1744] p-6 text-[#f6f1e8] shadow-sm">
        <p className="text-sm text-[#fdba74]">Start here</p>
        <h2 className="mt-1 font-display text-3xl">Who needs the next task?</h2>
        <p className="mt-2 max-w-xl text-sm text-[#f6f1e8]/70">Write what needs doing, pick one person, send it. They get it in My work.</p>
        <Button className="mt-5 bg-[#e8610a] text-white hover:bg-[#c2410c]" onClick={() => router.push("/admin/assign")}>
          Give someone work
        </Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Open with the team", stats?.totals.open ?? "—"],
          ["Overdue", stats?.totals.overdue ?? "—"],
          ["Done", stats?.totals.done ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display text-3xl">{value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl">Your people</h2>
          <Link href="/admin/people" className="text-sm underline">Invite someone</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {team.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => router.push(`/admin/assign?to=${member.id}`)}
              className="rounded-2xl border bg-card p-4 text-left transition hover:border-[#c2410c]/50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#1a1744] text-sm font-semibold text-[#f6f1e8]">
                  {member.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{member.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">{member.title || "Team member"}</span>
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>{member.open} open</span>
                <span className={member.overdue ? "text-[#b91c1c]" : "text-muted-foreground"}>
                  {member.overdue ? `${member.overdue} overdue` : "Clear"}
                </span>
              </div>
              <span className="mt-3 inline-flex text-sm font-medium text-[#c2410c]">Give work →</span>
            </button>
          ))}
          {!team.length && <p className="text-sm text-muted-foreground">Invite employees first, then assign from here.</p>}
        </div>
      </section>
    </ManagerShell>
  );
}

function AssignAdminForm() {
  const { data, refresh, openTask } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetPerson = searchParams.get("to") ?? "";
  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState(presetPerson);
  const [trackedPerson, setTrackedPerson] = useState(presetPerson);
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState(3);
  const [dueDay, setDueDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [handoffId, setHandoffId] = useState("");
  const [handoffPerson, setHandoffPerson] = useState("");

  const people = data.members.filter((member) => member.active);
  const projects = data.projects.filter((project) => !project.archivedAt);
  if (presetPerson !== trackedPerson) {
    setTrackedPerson(presetPerson);
    if (presetPerson && people.some((member) => member.id === presetPerson)) setPersonId(presetPerson);
  }

  useEffect(() => {
    let cancelled = false;
    api<TaskDTO[]>("/api/v1/tasks?view=search")
      .then((rows) => {
        if (!cancelled) setTasks(rows.filter((task) => task.status !== "DONE" && !task.parentId));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const chosen = people.find((member) => member.id === personId);

  async function giveWork(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Write what needs doing");
      return;
    }
    if (!personId) {
      toast.error("Pick one person");
      return;
    }
    setBusy(true);
    try {
      const task = await api<TaskDTO>("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          assigneeIds: [personId],
          projectId: projectId || null,
          priority,
          dueAt: dueDay
            ? (() => {
                const [year, month, day] = dueDay.split("-").map(Number);
                return zonedTimeToUtc(year, month, day, 18, 0, data.org.timezone).toISOString();
              })()
            : undefined,
        }),
      });
      toast.success(`Assigned to ${chosen?.name ?? "the team"}`);
      setTitle("");
      setDueDay("");
      setPriority(3);
      await refresh();
      openTask(task.id);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign");
    } finally {
      setBusy(false);
    }
  }

  async function handoffExisting() {
    if (!handoffId || !handoffPerson) {
      toast.error("Pick a task and a person");
      return;
    }
    setBusy(true);
    try {
      await api("/api/v1/tasks/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: [handoffId], assigneeIds: [handoffPerson] }),
      });
      toast.success("Assigned");
      setHandoffId("");
      const rows = await api<TaskDTO[]>("/api/v1/tasks?view=search");
      setTasks(rows.filter((task) => task.status !== "DONE" && !task.parentId));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ManagerShell
      eyebrow="Give work"
      title="One task. One person."
      hint="Managers use this page every day. Write the work, choose who owns it, send it."
    >
      <form onSubmit={giveWork} className="space-y-6 rounded-[1.75rem] border bg-card p-5 shadow-sm md:p-7">
        <div className="space-y-2">
          <Label htmlFor="assign-title">What needs doing?</Label>
          <Input
            id="assign-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Send the client report"
            className="h-12 text-base"
            required
            autoFocus
          />
        </div>

        <div className="space-y-3">
          <Label>Who should do it?</Label>
          <div className="grid gap-2 sm:grid-cols-2" role="listbox" aria-label="People">
            {people.map((member) => {
              const active = personId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => setPersonId(member.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${active ? "border-[#c2410c] bg-[#fff7ed]" : "bg-background hover:bg-secondary"}`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${active ? "bg-[#c2410c] text-white" : "bg-[#1a1744] text-[#f6f1e8]"}`}>
                    {member.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{member.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{member.role === "EMPLOYEE" ? member.title || "Employee" : member.role.replace("_", " ").toLowerCase()}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="assign-due">Due date</Label>
            <Input id="assign-due" type="date" value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Priority</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPriority(item.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${priority === item.value ? item.tone + " bg-background" : "border-transparent bg-secondary text-muted-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assign-project">Project (optional)</Label>
          <select
            id="assign-project"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">No project · Inbox</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-5">
          <Button type="submit" variant="saffron" className="h-12 px-6" disabled={busy}>
            {busy ? "Sending…" : chosen ? `Give this to ${chosen.name.split(" ")[0]}` : "Give this work"}
          </Button>
          <p className="text-sm text-muted-foreground">They will see it under My work, with a notification.</p>
        </div>
      </form>

      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer font-medium">Hand off an existing open task</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
          <label className="text-sm">
            Task
            <select aria-label="Existing task" className="mt-1 h-11 w-full rounded-lg border bg-background px-3" value={handoffId} onChange={(event) => setHandoffId(event.target.value)}>
              <option value="">Choose a task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Person
            <select aria-label="Handoff person" className="mt-1 h-11 w-full rounded-lg border bg-background px-3" value={handoffPerson} onChange={(event) => setHandoffPerson(event.target.value)}>
              <option value="">Choose a person</option>
              {people.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="button" variant="outline" className="h-11 w-full" disabled={busy} onClick={() => void handoffExisting()}>
              Assign
            </Button>
          </div>
        </div>
      </details>
    </ManagerShell>
  );
}

export function AssignAdmin() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening Give work…</p>}>
      <AssignAdminForm />
    </Suspense>
  );
}

export function PeopleAdmin() {
  const { data, refresh } = useWorkspace();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [csv, setCsv] = useState("email,name,role\n");
  const [link, setLink] = useState("");
  return (
    <ManagerShell eyebrow="People" title="Invite your team" hint="Employees join with a link, then receive work from Give work.">
      <form
        className="grid gap-2 rounded-2xl border bg-card p-4 md:grid-cols-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await api<{ url?: string }>("/api/v1/invites", { method: "POST", body: JSON.stringify({ email, name, role }) });
          setLink(result.url ?? "Invite emailed");
          setEmail("");
          await refresh();
        }}
      >
        <Input aria-label="Email" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input aria-label="Name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <select aria-label="Role" className="h-10 rounded-lg border bg-card px-2" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          {data.me.role === "SUPER_ADMIN" && <option value="ADMIN">Admin</option>}
        </select>
        <Button type="submit">Invite</Button>
      </form>
      {link && <p className="text-sm">Invite link: <a className="underline" href={link}>{link}</a></p>}
      <details className="rounded-2xl border bg-card p-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">Bulk CSV invite</summary>
        <form className="mt-3 space-y-2" onSubmit={async (event) => { event.preventDefault(); const rows = await api<{ url?: string }[]>("/api/v1/invites/csv", { method: "POST", body: JSON.stringify({ csv }) }); toast.success(`${rows.length} invites created`); }}>
          <Label>CSV import</Label>
          <Textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="CSV invites" />
          <Button type="submit" variant="outline">Import</Button>
        </form>
      </details>
      <ul className="divide-y rounded-2xl border bg-card">
        {data.members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href={`/admin/people/${member.id}`} className="font-medium">{member.name}</Link>
            <span className="text-sm text-muted-foreground">{member.email} · {member.role} · {member.active ? "active" : "inactive"}</span>
          </li>
        ))}
      </ul>
    </ManagerShell>
  );
}

export function PersonAdmin({ userId }: { userId: string }) {
  const { data, refresh } = useWorkspace();
  const router = useRouter();
  const [profile, setProfile] = useState<{ member: { name: string; email: string; role: string; active: boolean; title: string | null }; open: number; done: number; tasks: { id: string; title: string; status: string }[] } | null>(null);
  const [resetUrl, setResetUrl] = useState("");
  useEffect(() => { api<NonNullable<typeof profile>>(`/api/v1/members/${userId}`).then(setProfile).catch((err) => toast.error(err.message)); }, [userId]);
  if (!profile) return <p>Loading profile…</p>;
  return (
    <ManagerShell eyebrow="Person" title={profile.member.name} hint={`${profile.member.email} · ${profile.open} open · ${profile.done} done`}>
      <div className="flex flex-wrap gap-2">
        <Button variant="saffron" onClick={() => router.push(`/admin/assign?to=${userId}`)}>Give work</Button>
        {data.me.role === "SUPER_ADMIN" && (
          <Button variant="outline" onClick={async () => { await api(`/api/v1/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: profile.member.role === "ADMIN" ? "EMPLOYEE" : "ADMIN" }) }); toast.success("Role updated"); await refresh(); location.reload(); }}>Toggle admin</Button>
        )}
        <Button variant="outline" onClick={async () => { await api(`/api/v1/members/${userId}`, { method: "PATCH", body: JSON.stringify({ active: !profile.member.active }) }); toast.success(profile.member.active ? "Deactivated" : "Activated"); location.reload(); }}>{profile.member.active ? "Deactivate" : "Activate"}</Button>
        <Button variant="outline" onClick={async () => { const result = await api<{ url?: string }>(`/api/v1/members/${userId}/reset`, { method: "POST" }); setResetUrl(result.url ?? "Reset email sent"); }}>Send password reset</Button>
      </div>
      {resetUrl && <p className="text-sm break-all">{resetUrl}</p>}
      <ul className="divide-y rounded-2xl border bg-card">{profile.tasks.map((task) => <li key={task.id} className="px-4 py-2 text-sm">{task.status} · {task.title}</li>)}</ul>
    </ManagerShell>
  );
}

export function WorkloadAdmin() {
  const [data, setData] = useState<{ days: string[]; rows: { id: string; name: string; counts: number[] }[] } | null>(null);
  useEffect(() => { api<NonNullable<typeof data>>("/api/v1/admin/workload").then(setData); }, []);
  if (!data) return <p>Loading workload…</p>;
  const max = Math.max(1, ...data.rows.flatMap((row) => row.counts));
  return (
    <ManagerShell eyebrow="Workload" title="This week’s load" hint="A quiet view of how much is sitting with each person.">
      <div className="overflow-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead><tr><th className="p-3 text-left">Person</th>{data.days.map((day) => <th key={day} className="p-3">{day.slice(5)}</th>)}</tr></thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3">{row.name}</td>
                {row.counts.map((count, index) => <td key={index} className="p-3 text-center" style={{ background: `rgba(232,97,10,${count / max})` }}>{count || ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ManagerShell>
  );
}

export function ProjectsAdmin() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState("");
  return (
    <ManagerShell eyebrow="Projects" title="Projects" hint="Create a shared bucket, then assign people into it from Give work.">
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/v1/projects", { method: "POST", body: JSON.stringify({ name, memberIds: data.members.map((member) => member.id) }) }); setName(""); await refresh(); }}>
        <Input aria-label="Project name" value={name} onChange={(event) => setName(event.target.value)} placeholder="New project" required />
        <Button type="submit">Create</Button>
      </form>
      <ul className="space-y-2">
        {data.projects.map((project) => (
          <li key={project.id} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2">
            <Link href={`/projects/${project.id}`}>{project.name}</Link>
            <Button size="sm" variant="outline" onClick={async () => { await api(`/api/v1/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ archived: !project.archivedAt }) }); await refresh(); }}>{project.archivedAt ? "Restore" : "Archive"}</Button>
          </li>
        ))}
      </ul>
    </ManagerShell>
  );
}

export function ReportsAdmin() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<{ perEmployee: { name: string; open: number; completed: number; overdue: number; avgCycleHours: number }[]; perProject: { name: string; open: number; completed: number }[] } | null>(null);
  const [weekly, setWeekly] = useState("");
  async function load() {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    setReport(await api(`/api/v1/admin/reports?${params.toString()}`));
  }
  useEffect(() => {
    let cancelled = false;
    api<NonNullable<typeof report>>("/api/v1/admin/reports")
      .then((next) => {
        if (!cancelled) setReport(next);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : "Could not load the report"));
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <ManagerShell eyebrow="Reports" title="Reports" hint="Export when you need it. Day-to-day assigning stays on Give work.">
      <div className="flex flex-wrap gap-2">
        <Input type="date" aria-label="From" value={from} onChange={(event) => setFrom(event.target.value)} />
        <Input type="date" aria-label="To" value={to} onChange={(event) => setTo(event.target.value)} />
        <Button onClick={() => load()}>Update</Button>
        <a className="inline-flex h-10 items-center rounded-lg border px-3 text-sm" href={`/api/v1/admin/reports?format=csv${from ? `&from=${new Date(from).toISOString()}` : ""}`}>CSV</a>
        <a className="inline-flex h-10 items-center rounded-lg border px-3 text-sm" href={`/api/v1/admin/reports?format=pdf${from ? `&from=${new Date(from).toISOString()}` : ""}`}>PDF</a>
        <Button variant="outline" onClick={async () => { const result = await api<{ narrative: string }>("/api/v1/ai/weekly", { method: "POST" }); setWeekly(result.narrative); }}>Write the week</Button>
      </div>
      {weekly && <p className="rounded-2xl border bg-card p-4 text-sm">{weekly}</p>}
      <table className="w-full text-sm">
        <thead><tr><th className="text-left">Person</th><th>Open</th><th>Done</th><th>Overdue</th><th>Avg hours</th></tr></thead>
        <tbody>{report?.perEmployee.map((row) => <tr key={row.name}><td>{row.name}</td><td className="text-center">{row.open}</td><td className="text-center">{row.completed}</td><td className="text-center">{row.overdue}</td><td className="text-center">{row.avgCycleHours}</td></tr>)}</tbody>
      </table>
      <h2 className="font-display text-2xl">Projects</h2>
      <ul>{report?.perProject.map((row) => <li key={row.name}>{row.name}: {row.open} open, {row.completed} done</li>)}</ul>
    </ManagerShell>
  );
}

export function AuditAdmin() {
  const [rows, setRows] = useState<{ id: string; action: string; actor: string; createdAt: string; entityType: string }[]>([]);
  useEffect(() => { api<typeof rows>("/api/v1/admin/audit").then(setRows); }, []);
  return (
    <ManagerShell eyebrow="Audit" title="Audit log" hint="Who changed what, for the record.">
      <ul className="divide-y rounded-2xl border bg-card">
        {rows.map((row) => <li key={row.id} className="px-3 py-2 text-sm">{new Date(row.createdAt).toLocaleString()} · {row.actor} · {row.action} · {row.entityType}</li>)}
      </ul>
    </ManagerShell>
  );
}

export function SettingsAdmin() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState(data.org.name);
  const [timezone, setTimezone] = useState(data.org.timezone);
  const [workStart, setWorkStart] = useState(data.org.workStart);
  const [workEnd, setWorkEnd] = useState(data.org.workEnd);
  const [digestHour, setDigestHour] = useState(data.org.digestHour);
  const [notify, setNotify] = useState(data.org.notifyOnAssign);
  const [email, setEmail] = useState(data.org.emailOnAssign);
  const [label, setLabel] = useState("");
  return (
    <ManagerShell eyebrow="Settings" title="Workspace settings" hint="Quiet defaults. Change these once, then spend your day on Give work.">
      <form className="grid max-w-xl gap-3" onSubmit={async (event) => {
        event.preventDefault();
        await api("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify({ name, timezone, workStart, workEnd, digestHour, notifyOnAssign: notify, emailOnAssign: email }) });
        toast.success("Saved");
        await refresh();
      }}>
        <Label>Name</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
        <Label>Timezone</Label>
        <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        <Label>Working hours</Label>
        <div className="flex gap-2"><Input value={workStart} onChange={(event) => setWorkStart(event.target.value)} /><Input value={workEnd} onChange={(event) => setWorkEnd(event.target.value)} /></div>
        <Label>Morning digest hour ({timezone})</Label>
        <Input type="number" min={0} max={23} value={digestHour} onChange={(event) => setDigestHour(Number(event.target.value))} />
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} /> Notify in the app when work is assigned</label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} /> Also send email</label>
        <p className="text-sm text-muted-foreground">Working days: {data.org.workingDays.join(", ")} (0 is Sunday)</p>
        <Button type="submit">Save</Button>
      </form>
      <form className="flex gap-2" onSubmit={async (event) => { event.preventDefault(); await api("/api/v1/labels", { method: "POST", body: JSON.stringify({ name: label }) }); setLabel(""); await refresh(); }}>
        <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="New label" aria-label="Label name" />
        <Button type="submit" variant="outline">Add label</Button>
      </form>
      <ul className="flex flex-wrap gap-2">{data.labels.map((item) => <li key={item.id}><button className="rounded-full border px-3 py-1 text-sm" onClick={async () => { await api(`/api/v1/labels/${item.id}`, { method: "DELETE" }); await refresh(); }}>{item.name} ×</button></li>)}</ul>
    </ManagerShell>
  );
}
