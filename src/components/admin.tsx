"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { TaskDTO } from "@/lib/dto";
import { useWorkspace } from "./workspace";

export function AdminHome() {
  const [data, setData] = useState<{
    totals: { tasks: number; open: number; done: number; overdue: number };
    completionRate: number;
    perEmployee: { name: string; open: number; done: number; overdue: number; completionRate: number }[];
    weekly: { week: string; completed: number; created: number }[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<NonNullable<typeof data>>("/api/v1/admin/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);
  if (error) return <p>{error}</p>;
  if (!data) return <p>Loading the desk…</p>;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">Admin desk</p>
        <h1 className="font-display text-4xl">How the work is moving</h1>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Tasks", data.totals.tasks],
          ["Open", data.totals.open],
          ["Done", data.totals.done],
          ["Overdue", data.totals.overdue],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-sm">Completion rate {data.completionRate}%</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.perEmployee}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="open" fill="#1a1744" />
              <Bar dataKey="done" fill="#e8610a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-64 rounded-2xl border bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.weekly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" hide />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line dataKey="completed" stroke="#c2410c" />
              <Line dataKey="created" stroke="#2a2760" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <AdminNav />
    </div>
  );
}

export function AdminNav() {
  const links = [
    ["/admin", "Overview"],
    ["/admin/people", "People"],
    ["/admin/assign", "Assign"],
    ["/admin/workload", "Workload"],
    ["/admin/projects", "Projects"],
    ["/admin/reports", "Reports"],
    ["/admin/audit", "Audit"],
    ["/admin/settings", "Settings"],
  ];
  return (
    <nav className="flex flex-wrap gap-2 text-sm" aria-label="Admin">
      {links.map(([href, label]) => <Link key={href} className="rounded-full border bg-card px-3 py-1" href={href}>{label}</Link>)}
    </nav>
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
    <div className="space-y-4">
      <h1 className="font-display text-4xl">People</h1>
      <AdminNav />
      <form className="grid gap-2 rounded-2xl border bg-card p-4 md:grid-cols-4" onSubmit={async (event) => {
        event.preventDefault();
        const result = await api<{ url?: string }>("/api/v1/invites", { method: "POST", body: JSON.stringify({ email, name, role }) });
        setLink(result.url ?? "Invite emailed");
        setEmail("");
        await refresh();
      }}>
        <Input aria-label="Email" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input aria-label="Name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <select aria-label="Role" className="h-10 rounded-lg border bg-card px-2" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="EMPLOYEE">Employee</option>
          {data.me.role === "SUPER_ADMIN" && <option value="ADMIN">Admin</option>}
        </select>
        <Button type="submit">Invite</Button>
      </form>
      {link && <p className="text-sm">Invite link: <a className="underline" href={link}>{link}</a></p>}
      <form className="space-y-2" onSubmit={async (event) => { event.preventDefault(); const rows = await api<{ url?: string }[]>("/api/v1/invites/csv", { method: "POST", body: JSON.stringify({ csv }) }); toast.success(`${rows.length} invites created`); }}>
        <Label>CSV import</Label>
        <Textarea value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="CSV invites" />
        <Button type="submit" variant="outline">Import</Button>
      </form>
      <ul className="divide-y rounded-2xl border bg-card">
        {data.members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href={`/admin/people/${member.id}`} className="font-medium">{member.name}</Link>
            <span className="text-sm text-muted-foreground">{member.email} · {member.role} · {member.active ? "active" : "inactive"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonAdmin({ userId }: { userId: string }) {
  const { data, refresh } = useWorkspace();
  const [profile, setProfile] = useState<{ member: { name: string; email: string; role: string; active: boolean; title: string | null }; open: number; done: number; tasks: { id: string; title: string; status: string }[] } | null>(null);
  const [resetUrl, setResetUrl] = useState("");
  useEffect(() => { api<NonNullable<typeof profile>>(`/api/v1/members/${userId}`).then(setProfile).catch((err) => toast.error(err.message)); }, [userId]);
  if (!profile) return <p>Loading profile…</p>;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">{profile.member.name}</h1>
      <p>{profile.member.email} · {profile.open} open · {profile.done} done</p>
      <div className="flex flex-wrap gap-2">
        {data.me.role === "SUPER_ADMIN" && (
          <Button variant="outline" onClick={async () => { await api(`/api/v1/members/${userId}`, { method: "PATCH", body: JSON.stringify({ role: profile.member.role === "ADMIN" ? "EMPLOYEE" : "ADMIN" }) }); toast.success("Role updated"); await refresh(); location.reload(); }}>Toggle admin</Button>
        )}
        <Button variant="outline" onClick={async () => { await api(`/api/v1/members/${userId}`, { method: "PATCH", body: JSON.stringify({ active: !profile.member.active }) }); toast.success(profile.member.active ? "Deactivated" : "Activated"); location.reload(); }}>{profile.member.active ? "Deactivate" : "Activate"}</Button>
        <Button variant="outline" onClick={async () => { const result = await api<{ url?: string }>(`/api/v1/members/${userId}/reset`, { method: "POST" }); setResetUrl(result.url ?? "Reset email sent"); }}>Send password reset</Button>
      </div>
      {resetUrl && <p className="text-sm break-all">{resetUrl}</p>}
      <ul>{profile.tasks.map((task) => <li key={task.id} className="text-sm">{task.status} · {task.title}</li>)}</ul>
    </div>
  );
}

export function AssignAdmin() {
  const { data } = useWorkspace();
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [pickedTasks, setPickedTasks] = useState<string[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [priority, setPriority] = useState(2);
  const [due, setDue] = useState("");
  useEffect(() => { api<TaskDTO[]>("/api/v1/tasks?view=search").then(setTasks).catch(() => setTasks([])); }, []);
  const open = tasks.filter((task) => task.status !== "DONE");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Assign work</h1>
      <AdminNav />
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-2xl border bg-card p-3">
          <legend className="px-1 text-sm">Tasks</legend>
          {open.map((task) => <label key={task.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={pickedTasks.includes(task.id)} onChange={(event) => setPickedTasks((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} />{task.title}</label>)}
        </fieldset>
        <fieldset className="rounded-2xl border bg-card p-3">
          <legend className="px-1 text-sm">People</legend>
          {data.members.filter((member) => member.active).map((member) => <label key={member.id} className="flex gap-2 py-1 text-sm"><input type="checkbox" checked={people.includes(member.id)} onChange={(event) => setPeople((current) => event.target.checked ? [...current, member.id] : current.filter((id) => id !== member.id))} />{member.name}</label>)}
        </fieldset>
      </div>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Priority" className="h-10 rounded-lg border bg-card px-2" value={priority} onChange={(event) => setPriority(Number(event.target.value))}>
          <option value={1}>P1</option><option value={2}>P2</option><option value={3}>P3</option><option value={4}>P4</option>
        </select>
        <Input type="datetime-local" aria-label="Deadline" value={due} onChange={(event) => setDue(event.target.value)} />
        <Button onClick={async () => {
          await api("/api/v1/tasks/bulk", { method: "POST", body: JSON.stringify({ ids: pickedTasks, assigneeIds: people, priority, dueAt: due ? new Date(due).toISOString() : undefined }) });
          toast.success("Assigned");
        }}>Assign</Button>
      </div>
    </div>
  );
}

export function WorkloadAdmin() {
  const [data, setData] = useState<{ days: string[]; rows: { id: string; name: string; counts: number[] }[] } | null>(null);
  useEffect(() => { api<NonNullable<typeof data>>("/api/v1/admin/workload").then(setData); }, []);
  if (!data) return <p>Loading workload…</p>;
  const max = Math.max(1, ...data.rows.flatMap((row) => row.counts));
  return (
    <div>
      <h1 className="font-display text-4xl">Workload this week</h1>
      <AdminNav />
      <div className="mt-4 overflow-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-left">Person</th>{data.days.map((day) => <th key={day} className="p-2">{day.slice(5)}</th>)}</tr></thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td className="p-2">{row.name}</td>
                {row.counts.map((count, index) => <td key={index} className="p-2 text-center" style={{ background: `rgba(232,97,10,${count / max})` }}>{count || ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProjectsAdmin() {
  const { data, refresh } = useWorkspace();
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Projects</h1>
      <AdminNav />
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
    </div>
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
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Reports</h1>
      <AdminNav />
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
    </div>
  );
}

export function AuditAdmin() {
  const [rows, setRows] = useState<{ id: string; action: string; actor: string; createdAt: string; entityType: string }[]>([]);
  useEffect(() => { api<typeof rows>("/api/v1/admin/audit").then(setRows); }, []);
  return (
    <div>
      <h1 className="font-display text-4xl">Audit log</h1>
      <AdminNav />
      <ul className="mt-4 divide-y rounded-2xl border bg-card">
        {rows.map((row) => <li key={row.id} className="px-3 py-2 text-sm">{new Date(row.createdAt).toLocaleString()} · {row.actor} · {row.action} · {row.entityType}</li>)}
      </ul>
    </div>
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
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Workspace settings</h1>
      <AdminNav />
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
    </div>
  );
}
