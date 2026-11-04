"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TaskScreen } from "@/components/task-screen";

function Search() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  return <TaskScreen view="search" title={q ? `Search “${q}”` : "Search"} filter={q ? `text:${q}` : undefined} />;
}

export default function Page() {
  return <Suspense><Search /></Suspense>;
}
