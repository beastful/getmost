"use client";

import { useSearchParams } from "next/navigation";

export interface InviteParams {
  membershipId: string | null;
  userId: string | null;
  secret: string | null;
  expire: string | null;
}

export function useInviteParams(): InviteParams {
  const searchParams = useSearchParams();

  return {
    membershipId: searchParams.get("membershipId") ?? searchParams.get("userId"),
    userId: searchParams.get("userId"),
    secret: searchParams.get("secret"),
    expire: searchParams.get("expire"),
  };
}
