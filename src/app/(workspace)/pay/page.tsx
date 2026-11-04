"use client";

import { Suspense } from "react";
import { MyPay } from "@/components/pay";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening pay…</p>}>
      <MyPay />
    </Suspense>
  );
}
