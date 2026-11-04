import { can } from "@/lib/permissions";
import { getContext } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const context = await getContext();
  if (!context || !can(context.role, "reports.view")) {
    return (
      <div className="rounded-2xl border bg-card p-8">
        <h1 className="font-display text-3xl">Managers only</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your role can see assigned work, not the admin desk.</p>
      </div>
    );
  }
  return children;
}
