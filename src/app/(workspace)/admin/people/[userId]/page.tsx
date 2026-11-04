"use client";
import { useParams } from "next/navigation";
import { PersonAdmin } from "@/components/admin";
export default function Page() {
  const params = useParams<{ userId: string }>();
  return <PersonAdmin userId={params.userId} />;
}
