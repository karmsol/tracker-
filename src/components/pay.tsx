"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { formatInr, monthLabel } from "@/lib/money";
import { useWorkspace } from "./workspace";
import { AdminNav } from "./admin";

type Profile = {
  userId: string;
  baseSalary: number;
  hra: number;
  specialAllowance: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeduction: number;
  gross: number;
  totalDeductions: number;
  netPay: number;
  bankLast4: string | null;
  panMasked: string | null;
  notes: string | null;
};

type DeskPerson = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: string;
  profile: Profile | null;
  thisMonthSlipId: string | null;
  thisMonthStatus: string | null;
};

type Slip = {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  year: number;
  month: number;
  periodLabel: string;
  baseSalary: number;
  hra: number;
  specialAllowance: number;
  gross: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netPay: number;
  bankLast4: string | null;
  status: string;
  emailedAt: string | null;
};

type SlipForm = {
  baseSalary: string;
  hra: string;
  specialAllowance: string;
  pfDeduction: string;
  taxDeduction: string;
  otherDeduction: string;
  bankLast4: string;
};

function emptyForm(): SlipForm {
  return { baseSalary: "", hra: "", specialAllowance: "", pfDeduction: "", taxDeduction: "", otherDeduction: "", bankLast4: "" };
}

function formFromProfile(profile: Profile | null | undefined): SlipForm {
  if (!profile) return emptyForm();
  return {
    baseSalary: String(profile.baseSalary),
    hra: String(profile.hra),
    specialAllowance: String(profile.specialAllowance),
    pfDeduction: String(profile.pfDeduction),
    taxDeduction: String(profile.taxDeduction),
    otherDeduction: String(profile.otherDeduction),
    bankLast4: profile.bankLast4 ?? "",
  };
}

function formFromSlip(slip: Slip): SlipForm {
  return {
    baseSalary: String(slip.baseSalary),
    hra: String(slip.hra),
    specialAllowance: String(slip.specialAllowance),
    pfDeduction: String(slip.pfDeduction),
    taxDeduction: String(slip.taxDeduction),
    otherDeduction: String(slip.otherDeduction),
    bankLast4: slip.bankLast4 ?? "",
  };
}

function previewFrom(form: SlipForm) {
  const baseSalary = Number(form.baseSalary) || 0;
  const hra = Number(form.hra) || 0;
  const specialAllowance = Number(form.specialAllowance) || 0;
  const pfDeduction = Number(form.pfDeduction) || 0;
  const taxDeduction = Number(form.taxDeduction) || 0;
  const otherDeduction = Number(form.otherDeduction) || 0;
  const gross = baseSalary + hra + specialAllowance;
  const totalDeductions = pfDeduction + taxDeduction + otherDeduction;
  return { gross, totalDeductions, netPay: Math.max(0, gross - totalDeductions) };
}

function statusLabel(status: string | null | undefined) {
  if (!status) return "Not in this month";
  if (status === "DRAFT") return "Draft · edit before send";
  if (status === "EMAILED") return "Emailed";
  return "Ready";
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AmountFields({ form, setForm }: { form: SlipForm; setForm: (next: SlipForm) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Basic salary (INR)" value={form.baseSalary} onChange={(value) => setForm({ ...form, baseSalary: value })} required />
      <Field label="HRA" value={form.hra} onChange={(value) => setForm({ ...form, hra: value })} />
      <Field label="Special allowance" value={form.specialAllowance} onChange={(value) => setForm({ ...form, specialAllowance: value })} />
      <Field label="PF deduction" value={form.pfDeduction} onChange={(value) => setForm({ ...form, pfDeduction: value })} />
      <Field label="Tax deduction" value={form.taxDeduction} onChange={(value) => setForm({ ...form, taxDeduction: value })} />
      <Field label="Other deduction" value={form.otherDeduction} onChange={(value) => setForm({ ...form, otherDeduction: value })} />
      <div className="space-y-1">
        <Label htmlFor="bank">Bank last 4</Label>
        <Input
          id="bank"
          value={form.bankLast4}
          maxLength={4}
          onChange={(event) => setForm({ ...form, bankLast4: event.target.value.replace(/\D/g, "").slice(0, 4) })}
          placeholder="4821"
        />
      </div>
    </div>
  );
}

export function PayAdmin() {
  const { data } = useWorkspace();
  const [desk, setDesk] = useState<{ people: DeskPerson[]; current: { year: number; month: number; label: string } } | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [included, setIncluded] = useState<string[]>([]);
  const [form, setForm] = useState<SlipForm>(emptyForm());
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await api<NonNullable<typeof desk>>("/api/v1/admin/pay");
    setDesk(next);
    setYear(next.current.year);
    setMonth(next.current.month);
    setIncluded((current) => {
      if (current.length) return current.filter((id) => next.people.some((person) => person.id === id && person.profile));
      return next.people.filter((person) => person.profile).map((person) => person.id);
    });
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    api<NonNullable<typeof desk>>("/api/v1/admin/pay")
      .then((next) => {
        if (cancelled) return;
        setDesk(next);
        setYear(next.current.year);
        setMonth(next.current.month);
        setIncluded(next.people.filter((person) => person.profile).map((person) => person.id));
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not open pay");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const person = desk?.people.find((item) => item.id === selected);
  const preview = useMemo(() => previewFrom(form), [form]);

  function pickPerson(item: DeskPerson) {
    setSelected(item.id);
    setForm(formFromProfile(item.profile));
  }

  function toggleIncluded(id: string) {
    setIncluded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function savePackage(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await api("/api/v1/admin/pay/profile", {
        method: "POST",
        body: JSON.stringify({
          userId: selected,
          baseSalary: Number(form.baseSalary),
          hra: Number(form.hra) || 0,
          specialAllowance: Number(form.specialAllowance) || 0,
          pfDeduction: Number(form.pfDeduction) || 0,
          taxDeduction: Number(form.taxDeduction) || 0,
          otherDeduction: Number(form.otherDeduction) || 0,
          bankLast4: form.bankLast4 || null,
        }),
      });
      toast.success("Salary package saved");
      const next = await load();
      if (!included.includes(selected)) setIncluded([...included, selected]);
      const refreshed = next.people.find((item) => item.id === selected);
      if (refreshed) setForm(formFromProfile(refreshed.profile));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!included.length) {
      toast.error("Tick at least one person to include");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ count: number }>("/api/v1/admin/pay/generate", {
        method: "POST",
        body: JSON.stringify({ year, month, userIds: included }),
      });
      toast.success(`Drafted ${result.count} slip${result.count === 1 ? "" : "s"}. Edit, then email.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate");
    } finally {
      setBusy(false);
    }
  }

  async function emailSelected() {
    if (!included.length) {
      toast.error("Tick the people whose slips you want to email");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ count: number }>("/api/v1/admin/pay/email-month", {
        method: "POST",
        body: JSON.stringify({ year, month, userIds: included }),
      });
      toast.success(result.count ? `Emailed ${result.count} slip${result.count === 1 ? "" : "s"}` : "No draft slips to email for the selected people");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not email");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlip() {
    if (!person?.thisMonthSlipId) return;
    if (!confirm(`Remove ${person.name}'s slip for this month?`)) return;
    setBusy(true);
    try {
      await api(`/api/v1/payslips/${person.thisMonthSlipId}`, { method: "DELETE" });
      toast.success("Slip removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  async function saveSlipEdits() {
    if (!person?.thisMonthSlipId) return;
    setBusy(true);
    try {
      await api(`/api/v1/payslips/${person.thisMonthSlipId}`, {
        method: "PATCH",
        body: JSON.stringify({
          baseSalary: Number(form.baseSalary),
          hra: Number(form.hra) || 0,
          specialAllowance: Number(form.specialAllowance) || 0,
          pfDeduction: Number(form.pfDeduction) || 0,
          taxDeduction: Number(form.taxDeduction) || 0,
          otherDeduction: Number(form.otherDeduction) || 0,
          bankLast4: form.bankLast4 || null,
        }),
      });
      toast.success("Slip updated. Email when it looks right.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update slip");
    } finally {
      setBusy(false);
    }
  }

  if (!desk) return <p className="text-sm text-muted-foreground">Opening pay…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">Payrolls</p>
        <h1 className="font-display text-4xl md:text-5xl">Salaries and slips</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          1) Tick who is in this month · 2) Save or edit amounts · 3) Generate drafts · 4) Email only when ready.
          Untick someone to leave them out. Remove a slip if it should not go out. Slips stay available for about one year.
        </p>
        <p className="text-sm text-muted-foreground">
          Payroll day is the {data.org.payrollDay}
          {data.org.payrollDay === 1 ? "st" : data.org.payrollDay === 2 ? "nd" : data.org.payrollDay === 3 ? "rd" : "th"} of each month
          — admins are notified when salary time arrives. Change it under Settings.
        </p>
      </header>
      <AdminNav />

      <section className="rounded-[1.75rem] border bg-[#1a1744] p-5 text-[#f6f1e8] md:p-6">
        <p className="text-sm text-[#fdba74]">Payroll run</p>
        <h2 className="mt-1 font-display text-3xl">{monthLabel(year, month)}</h2>
        <p className="mt-2 text-sm text-[#f6f1e8]/70">{included.length} people selected</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="text-sm">
            Year
            <Input className="mt-1 w-28 bg-white text-[#1c1917]" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label className="text-sm">
            Month
            <Input className="mt-1 w-24 bg-white text-[#1c1917]" type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <Button type="button" className="bg-[#e8610a] text-white hover:bg-[#c2410c]" disabled={busy} onClick={() => void generate()}>
              Generate drafts for selected
            </Button>
            <Button type="button" variant="outline" className="border-white/30 bg-transparent text-[#f6f1e8] hover:bg-white/10" disabled={busy} onClick={() => void emailSelected()}>
              Email selected drafts
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="font-medium">Who is in this month?</h2>
            <div className="flex gap-2 text-xs">
              <button type="button" className="underline" onClick={() => setIncluded(desk.people.filter((person) => person.profile).map((person) => person.id))}>
                Select all with pay
              </button>
              <button type="button" className="underline" onClick={() => setIncluded([])}>
                Clear
              </button>
            </div>
          </div>
          <ul className="space-y-1">
            {desk.people.map((item) => (
              <li key={item.id} className={`flex items-center gap-2 rounded-xl px-2 py-2 ${selected === item.id ? "bg-[#fff7ed]" : "hover:bg-secondary"}`}>
                <input
                  type="checkbox"
                  aria-label={`Include ${item.name}`}
                  checked={included.includes(item.id)}
                  disabled={!item.profile}
                  onChange={() => toggleIncluded(item.id)}
                />
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => pickPerson(item)}>
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.profile ? formatInr(item.profile.netPay) : "Set a package first"} · {statusLabel(item.thisMonthStatus)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          {!person && <p className="text-sm text-muted-foreground">Pick a person to set pay, edit their draft slip, or remove them from this month.</p>}
          {person && (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-3xl">{person.name}</h2>
                <p className="text-sm text-muted-foreground">{person.email}</p>
                <p className="mt-1 text-sm">{statusLabel(person.thisMonthStatus)}</p>
              </div>
              <form className="space-y-4" onSubmit={savePackage}>
                <AmountFields form={form} setForm={setForm} />
                <div className="grid gap-2 rounded-2xl bg-secondary/70 p-4 text-sm sm:grid-cols-3">
                  <div><p className="text-muted-foreground">Gross</p><p className="font-display text-2xl">{formatInr(preview.gross)}</p></div>
                  <div><p className="text-muted-foreground">Deductions</p><p className="font-display text-2xl">{formatInr(preview.totalDeductions)}</p></div>
                  <div><p className="text-muted-foreground">Net</p><p className="font-display text-2xl text-[#c2410c]">{formatInr(preview.netPay)}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="saffron" disabled={busy}>Save package</Button>
                  {person.thisMonthSlipId && (
                    <>
                      <Button type="button" variant="outline" disabled={busy} onClick={() => void saveSlipEdits()}>
                        Save edits to this slip
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          const response = await fetch(`/api/v1/payslips/${person.thisMonthSlipId}/pdf`);
                          if (!response.ok) {
                            toast.error("Could not download PDF");
                            return;
                          }
                          const blob = await response.blob();
                          const disposition = response.headers.get("Content-Disposition") || "";
                          const match = /filename="([^"]+)"/.exec(disposition);
                          const filename = match?.[1] ?? `salary-slip-${person.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
                          const url = URL.createObjectURL(blob);
                          const anchor = document.createElement("a");
                          anchor.href = url;
                          anchor.download = filename;
                          anchor.click();
                          URL.revokeObjectURL(url);
                          toast.success("Salary slip downloaded");
                        }}
                      >
                        Download PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={async () => {
                          await api(`/api/v1/payslips/${person.thisMonthSlipId}/email`, { method: "POST" });
                          toast.success(`Slip emailed to ${person.email}`);
                          await load();
                        }}
                      >
                        Email this slip
                      </Button>
                      <Button type="button" variant="destructive" disabled={busy} onClick={() => void removeSlip()}>
                        Remove slip
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Workspace: {data.org.name}. Invite new people under People, then set their package here.</p>
    </div>
  );
}

export function MyPay() {
  const { data } = useWorkspace();
  const params = useSearchParams();
  const focus = params.get("slip");
  const manager = data.me.role === "ADMIN" || data.me.role === "SUPER_ADMIN";
  const [slips, setSlips] = useState<Slip[]>([]);
  const [active, setActive] = useState<Slip | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SlipForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => previewFrom(form), [form]);

  async function refresh(preferredId?: string | null) {
    const rows = await api<Slip[]>("/api/v1/payslips");
    setSlips(rows);
    const next = rows.find((row) => row.id === (preferredId || active?.id || focus)) ?? rows[0] ?? null;
    setActive(next);
    if (next) setForm(formFromSlip(next));
    return rows;
  }

  useEffect(() => {
    let cancelled = false;
    api<Slip[]>("/api/v1/payslips")
      .then((rows) => {
        if (cancelled) return;
        setSlips(rows);
        const picked = rows.find((row) => row.id === focus) ?? rows[0] ?? null;
        setActive(picked);
        if (picked) setForm(formFromSlip(picked));
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load slips");
      });
    return () => {
      cancelled = true;
    };
  }, [focus]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">{manager ? "Payrolls" : "My pay"}</p>
        <h1 className="font-display text-4xl">{manager ? "Payrolls" : "Your salary slips"}</h1>
        <p className="text-sm text-muted-foreground">
          {manager
            ? "About one year of slips stay here for download. To add or remove people from a month, or edit before send, use Manage payroll."
            : "About one year of your salary slips stay here. Open any month and download the PDF."}
        </p>
        {manager && (
          <Button asChild variant="saffron">
            <Link href="/admin/pay">Manage payroll · add, edit, remove, email</Link>
          </Button>
        )}
      </header>
      {!slips.length && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-display text-2xl">No slips yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {manager ? "Open Manage payroll, tick people, then Generate drafts." : "Ask your manager to generate this month’s payroll."}
          </p>
        </div>
      )}
      {!!slips.length && (
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <ul className="space-y-2">
            {slips.map((slip) => (
              <li key={slip.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(slip);
                    setForm(formFromSlip(slip));
                    setEditing(false);
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${active?.id === slip.id ? "border-[#c2410c] bg-[#fff7ed]" : "bg-card"}`}
                >
                  <span className="block font-medium">{slip.periodLabel}</span>
                  <span className="block text-sm text-muted-foreground">
                    {manager ? `${slip.name} · ` : ""}
                    {formatInr(slip.netPay)} · {statusLabel(slip.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {active && (
            <article className="rounded-[1.5rem] border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">Salary slip</p>
                  <h2 className="font-display text-3xl">{active.periodLabel}</h2>
                  <p className="text-sm text-muted-foreground">{active.name} · {active.email}</p>
                  <p className="mt-1 text-sm">{statusLabel(active.status)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Net pay</p>
                  <p className="font-display text-3xl text-[#1a1744]">{formatInr(editing ? preview.netPay : active.netPay)}</p>
                </div>
              </div>

              {manager && editing ? (
                <div className="mt-5 space-y-4">
                  <AmountFields form={form} setForm={setForm} />
                  <div className="grid gap-2 rounded-2xl bg-secondary/70 p-4 text-sm sm:grid-cols-3">
                    <div><p className="text-muted-foreground">Gross</p><p className="font-display text-2xl">{formatInr(preview.gross)}</p></div>
                    <div><p className="text-muted-foreground">Deductions</p><p className="font-display text-2xl">{formatInr(preview.totalDeductions)}</p></div>
                    <div><p className="text-muted-foreground">Net</p><p className="font-display text-2xl text-[#c2410c]">{formatInr(preview.netPay)}</p></div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
                  <Line label="Basic" value={formatInr(active.baseSalary)} />
                  <Line label="HRA" value={formatInr(active.hra)} />
                  <Line label="Special allowance" value={formatInr(active.specialAllowance)} />
                  <Line label="Gross" value={formatInr(active.gross)} />
                  <Line label="PF" value={`− ${formatInr(active.pfDeduction)}`} />
                  <Line label="Tax" value={`− ${formatInr(active.taxDeduction)}`} />
                  <Line label="Other deductions" value={`− ${formatInr(active.otherDeduction)}`} />
                  <Line label="Total deductions" value={`− ${formatInr(active.totalDeductions)}`} />
                </div>
              )}

              {active.bankLast4 && !editing && <p className="mt-4 text-sm text-muted-foreground">Bank account ending {active.bankLast4}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {!editing && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const response = await fetch(`/api/v1/payslips/${active.id}/pdf`);
                        if (!response.ok) throw new Error("Could not download PDF");
                        const blob = await response.blob();
                        const disposition = response.headers.get("Content-Disposition") || "";
                        const match = /filename="([^"]+)"/.exec(disposition);
                        const filename = match?.[1] ?? `salary-slip-${active.year}-${String(active.month).padStart(2, "0")}.pdf`;
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement("a");
                        anchor.href = url;
                        anchor.download = filename;
                        anchor.click();
                        URL.revokeObjectURL(url);
                        toast.success("Salary slip downloaded");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not download");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Download PDF
                  </Button>
                )}
                {manager && !editing && (
                  <Button variant="outline" onClick={() => { setForm(formFromSlip(active)); setEditing(true); }}>
                    Edit before send
                  </Button>
                )}
                {manager && editing && (
                  <>
                    <Button
                      variant="saffron"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const updated = await api<Slip>(`/api/v1/payslips/${active.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({
                              baseSalary: Number(form.baseSalary),
                              hra: Number(form.hra) || 0,
                              specialAllowance: Number(form.specialAllowance) || 0,
                              pfDeduction: Number(form.pfDeduction) || 0,
                              taxDeduction: Number(form.taxDeduction) || 0,
                              otherDeduction: Number(form.otherDeduction) || 0,
                              bankLast4: form.bankLast4 || null,
                            }),
                          });
                          toast.success("Slip saved as draft");
                          setEditing(false);
                          await refresh(updated.id);
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Could not save");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Save changes
                    </Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setForm(formFromSlip(active)); }}>Cancel</Button>
                  </>
                )}
                {(manager || active.userId === data.me.id) && !editing && (
                  <Button
                    variant="saffron"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api(`/api/v1/payslips/${active.id}/email`, { method: "POST" });
                        toast.success("Salary slip emailed");
                        await refresh(active.id);
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not email");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Email this slip
                  </Button>
                )}
                {manager && !editing && (
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={async () => {
                      if (!confirm(`Remove ${active.name}'s slip?`)) return;
                      setBusy(true);
                      try {
                        await api(`/api/v1/payslips/${active.id}`, { method: "DELETE" });
                        toast.success("Slip removed");
                        setEditing(false);
                        await refresh(null);
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Could not remove");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Remove person from this month
                  </Button>
                )}
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
