"use client";

import { useSearchParams } from "next/navigation";

export function useWorkspaceId(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get("id");
}
