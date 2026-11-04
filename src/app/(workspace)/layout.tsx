import { Suspense } from "react";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/workspace";
import { auth } from "@/lib/auth";
import { getContext } from "@/lib/session";
import { loadBootstrap } from "@/server/org";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const context = await getContext();
  if (!context) redirect("/welcome");
  const bootstrap = await loadBootstrap(context);
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Opening the desk…</p>}>
      <WorkspaceProvider initial={bootstrap}>{children}</WorkspaceProvider>
    </Suspense>
  );
}
