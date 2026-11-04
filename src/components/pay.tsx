"use client";

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

function SlipCard({ slip, onEmail, canEmail }: { slip: Slip; onEmail?: () => void; canEmail?: boolean }) {
  return (
    <article className="rounded-[1.5rem] border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">Salary slip</p>
          <h2 className="font-display text-3xl">{slip.periodLabel}</h2>
          <p className="text-sm text-muted-foreground">{slip.name} · {slip.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Net pay</p>
          <p className="font-display text-3xl text-[#1a1744]">{formatInr(slip.netPay)}</p>
          <p className="text-xs text-muted-foreground">{slip.status === "EMAILED" ? "Emailed" : "Issued"}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        <Line label="Basic" value={formatInr(slip.baseSalary)} />
        <Line label="HRA" value={formatInr(slip.hra)} />
        <Line label="Special allowance" value={formatInr(slip.specialAllowance)} />
        <Line label="Gross" value={formatInr(slip.gross)} />
        <Line label="PF" value={`− ${formatInr(slip.pfDeduction)}`} />
        <Line label="Tax" value={`− ${formatInr(slip.taxDeduction)}`} />
        <Line label="Other deductions" value={`− ${formatInr(slip.otherDeduction)}`} />
        <Line label="Total deductions" value={`− ${formatInr(slip.totalDeductions)}`} />
      </div>
      {slip.bankLast4 && <p className="mt-4 text-sm text-muted-foreground">Bank account ending {slip.bankLast4}</p>}
      {canEmail && onEmail && (
        <Button className="mt-4" variant="saffron" onClick={onEmail}>
          Email this slip
        </Button>
      )}
    </article>
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

export function PayAdmin() {
  const { data } = useWorkspace();
  const [desk, setDesk] = useState<{ people: DeskPerson[]; current: { year: number; month: number; label: string } } | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({
    baseSalary: "",
    hra: "",
    specialAllowance: "",
    pfDeduction: "",
    taxDeduction: "",
    otherDeduction: "",
    bankLast4: "",
  });
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [busy, setBusy] = useState(false);

  async function load() {
    const next = await api<NonNullable<typeof desk>>("/api/v1/admin/pay");
    setDesk(next);
    setYear(next.current.year);
    setMonth(next.current.month);
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
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not open pay");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const person = desk?.people.find((item) => item.id === selected);

  function pickPerson(item: DeskPerson) {
    setSelected(item.id);
    const profile = item.profile;
    setForm({
      baseSalary: profile ? String(profile.baseSalary) : "",
      hra: profile ? String(profile.hra) : "",
      specialAllowance: profile ? String(profile.specialAllowance) : "",
      pfDeduction: profile ? String(profile.pfDeduction) : "",
      taxDeduction: profile ? String(profile.taxDeduction) : "",
      otherDeduction: profile ? String(profile.otherDeduction) : "",
      bankLast4: profile?.bankLast4 ?? "",
    });
  }

  const preview = useMemo(() => {
    const baseSalary = Number(form.baseSalary) || 0;
    const hra = Number(form.hra) || 0;
    const specialAllowance = Number(form.specialAllowance) || 0;
    const pfDeduction = Number(form.pfDeduction) || 0;
    const taxDeduction = Number(form.taxDeduction) || 0;
    const otherDeduction = Number(form.otherDeduction) || 0;
    const gross = baseSalary + hra + specialAllowance;
    const totalDeductions = pfDeduction + taxDeduction + otherDeduction;
    return { gross, totalDeductions, netPay: Math.max(0, gross - totalDeductions) };
  }, [form]);

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
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const result = await api<{ count: number }>("/api/v1/admin/pay/generate", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      });
      toast.success(`Created ${result.count} salary slip${result.count === 1 ? "" : "s"}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate");
    } finally {
      setBusy(false);
    }
  }

  async function emailMonth() {
    setBusy(true);
    try {
      const result = await api<{ count: number }>("/api/v1/admin/pay/email-month", {
        method: "POST",
        body: JSON.stringify({ year, month }),
      });
      toast.success(`Emailed ${result.count} salary slip${result.count === 1 ? "" : "s"}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not email");
    } finally {
      setBusy(false);
    }
  }

  if (!desk) return <p className="text-sm text-muted-foreground">Opening pay…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">Pay</p>
        <h1 className="font-display text-4xl md:text-5xl">Salaries and slips</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Set each person’s monthly package, generate the month’s slips, then email them. Employees open the same slip under My pay.
        </p>
      </header>
      <AdminNav />

      <section className="rounded-[1.75rem] border bg-[#1a1744] p-5 text-[#f6f1e8] md:p-6">
        <p className="text-sm text-[#fdba74]">This month</p>
        <h2 className="mt-1 font-display text-3xl">{monthLabel(year, month)}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="text-sm">
            Year
            <Input className="mt-1 w-28 bg-white text-[#1c1917]" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label className="text-sm">
            Month
            <Input className="mt-1 w-24 bg-white text-[#1c1917]" type="number" min={1} max={12} value={month} onChange={(event) => setMonth(Number(event.target.value))} />
          </label>
          <div className="flex items-end gap-2">
            <Button type="button" className="bg-[#e8610a] text-white hover:bg-[#c2410c]" disabled={busy} onClick={() => void generate()}>
              Generate slips
            </Button>
            <Button type="button" variant="outline" className="border-white/30 bg-transparent text-[#f6f1e8] hover:bg-white/10" disabled={busy} onClick={() => void emailMonth()}>
              Email all slips
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-[#f6f1e8]/65">Without Resend or SMTP, the mail is stored in EmailOutbox and logged for local demo.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border bg-card p-3">
          <h2 className="px-2 pb-2 font-medium">Team</h2>
          <ul className="space-y-1">
            {desk.people.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pickPerson(item)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ${selected === item.id ? "bg-[#fff7ed] ring-1 ring-[#c2410c]/40" : "hover:bg-secondary"}`}
                >
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">{item.title || item.role}</span>
                  </span>
                  <span className="text-right text-xs">
                    <span className="block">{item.profile ? formatInr(item.profile.netPay) : "No package"}</span>
                    <span className="block text-muted-foreground">{item.thisMonthStatus ?? "No slip"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          {!person && <p className="text-sm text-muted-foreground">Pick a person to set their salary package.</p>}
          {person && (
            <form className="space-y-4" onSubmit={savePackage}>
              <div>
                <h2 className="font-display text-3xl">{person.name}</h2>
                <p className="text-sm text-muted-foreground">{person.email}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Basic salary (INR)" value={form.baseSalary} onChange={(value) => setForm({ ...form, baseSalary: value })} required />
                <Field label="HRA" value={form.hra} onChange={(value) => setForm({ ...form, hra: value })} />
                <Field label="Special allowance" value={form.specialAllowance} onChange={(value) => setForm({ ...form, specialAllowance: value })} />
                <Field label="PF deduction" value={form.pfDeduction} onChange={(value) => setForm({ ...form, pfDeduction: value })} />
                <Field label="Tax deduction" value={form.taxDeduction} onChange={(value) => setForm({ ...form, taxDeduction: value })} />
                <Field label="Other deduction" value={form.otherDeduction} onChange={(value) => setForm({ ...form, otherDeduction: value })} />
                <div className="space-y-1">
                  <Label htmlFor="bank">Bank last 4</Label>
                  <Input id="bank" value={form.bankLast4} maxLength={4} onChange={(event) => setForm({ ...form, bankLast4: event.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="4821" />
                </div>
              </div>
              <div className="grid gap-2 rounded-2xl bg-secondary/70 p-4 text-sm sm:grid-cols-3">
                <div><p className="text-muted-foreground">Gross</p><p className="font-display text-2xl">{formatInr(preview.gross)}</p></div>
                <div><p className="text-muted-foreground">Deductions</p><p className="font-display text-2xl">{formatInr(preview.totalDeductions)}</p></div>
                <div><p className="text-muted-foreground">Net</p><p className="font-display text-2xl text-[#c2410c]">{formatInr(preview.netPay)}</p></div>
              </div>
              <Button type="submit" variant="saffron" disabled={busy}>Save package</Button>
              {person.thisMonthSlipId && (
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
                  Email this month’s slip
                </Button>
              )}
            </form>
          )}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Workspace: {data.org.name}. Amounts are whole Indian rupees.</p>
    </div>
  );
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
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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

  useEffect(() => {
    let cancelled = false;
    api<Slip[]>("/api/v1/payslips")
      .then((rows) => {
        if (cancelled) return;
        setSlips(rows);
        setActive(rows.find((row) => row.id === focus) ?? rows[0] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load slips");
      });
    return () => {
      cancelled = true;
    };
  }, [focus]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#c2410c]">My pay</p>
        <h1 className="font-display text-4xl">{manager ? "Pay slips" : "Your salary slips"}</h1>
        <p className="text-sm text-muted-foreground">
          {manager
            ? "Managers can see every issued slip. Employees only see their own."
            : "When payroll runs, your slip lands here and in your email."}
        </p>
      </header>
      {!slips.length && (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-display text-2xl">No slips yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Ask your manager to generate this month’s payroll.</p>
        </div>
      )}
      {!!slips.length && (
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <ul className="space-y-2">
            {slips.map((slip) => (
              <li key={slip.id}>
                <button
                  type="button"
                  onClick={() => setActive(slip)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left ${active?.id === slip.id ? "border-[#c2410c] bg-[#fff7ed]" : "bg-card"}`}
                >
                  <span className="block font-medium">{slip.periodLabel}</span>
                  <span className="block text-sm text-muted-foreground">
                    {manager ? `${slip.name} · ` : ""}
                    {formatInr(slip.netPay)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {active && (
            <SlipCard
              slip={active}
              canEmail={manager || active.userId === data.me.id}
              onEmail={async () => {
                await api(`/api/v1/payslips/${active.id}/email`, { method: "POST" });
                toast.success("Salary slip emailed");
                const rows = await api<Slip[]>("/api/v1/payslips");
                setSlips(rows);
                setActive(rows.find((row) => row.id === active.id) ?? rows[0] ?? null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
