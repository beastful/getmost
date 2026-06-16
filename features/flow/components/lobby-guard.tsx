"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppwriteException } from "appwrite";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useWorkspace } from "@/features/dashboard/hooks/use-workspace";
import { useWorkspaceId } from "@/features/flow/hooks/use-workspace-id";
import { useInviteParams } from "@/features/flow/hooks/use-invite-params";
import { useLobby } from "@/features/flow/contexts/lobby-context";
import { teams } from "@/lib/appwrite";

type MembershipState =
  | "checking"
  | "visitor"
  | "invited"
  | "member"
  | "invite-invalid";

function getInviteSignal(value: unknown):
  | { targetUserId: string; token: string; sentAt: number }
  | null {
  if (!value || typeof value !== "object") return null;

  const maybeUser = value as {
    inviteSignal?: {
      targetUserId?: string;
      token?: string;
      sentAt?: number;
    } | null;
  };

  const signal = maybeUser.inviteSignal;

  if (
    !signal ||
    typeof signal.targetUserId !== "string" ||
    typeof signal.token !== "string" ||
    typeof signal.sentAt !== "number"
  ) {
    return null;
  }

  return signal;
}

function CheckingAccessView() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-500">Checking access...</p>
      </div>
    </div>
  );
}

function VisitorView() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">Access required</h2>
        <p className="mt-2 text-sm text-slate-500">
          You are viewing this workspace as a visitor. Wait for the owner to send you an invitation.
        </p>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Waiting for invitation...
        </div>
      </div>
    </div>
  );
}

function InvitedView() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="h-6 w-6 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">Invitation received</h2>
        <p className="mt-2 text-sm text-slate-500">
          The workspace owner has invited you to join. Please check your email and click the latest confirmation link.
        </p>

        <div className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          If an older email link does not work, use the most recent invitation email instead.
        </div>
      </div>
    </div>
  );
}

function InvalidInviteView() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <svg className="h-6 w-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m0 3.75h.007v.008H12v-.008z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.29 3.86L1.82 18a2.25 2.25 0 001.93 3.375h16.5A2.25 2.25 0 0022.18 18l-8.47-14.14a2.25 2.25 0 00-3.42 0z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">Invitation is no longer valid</h2>
        <p className="mt-2 text-sm text-slate-500">
          This invitation link is invalid or outdated. Please ask the workspace owner to send you a new invitation.
        </p>
      </div>
    </div>
  );
}

function LobbyGuardInner({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = useWorkspaceId();
  const { membershipId, userId, secret } = useInviteParams();
  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(workspaceId);
  const { provider } = useLobby();

  const [state, setState] = useState<MembershipState>("checking");
  const [hasResolvedInitialAccess, setHasResolvedInitialAccess] = useState(false);

  const processedInviteTokenRef = useRef<string | null>(null);
  const isConfirmingRef = useRef(false);

  const clearInviteParams = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("membershipId");
    url.searchParams.delete("userId");
    url.searchParams.delete("secret");
    url.searchParams.delete("expire");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const checkMembership = useCallback(async () => {
    if (!workspaceId) {
      setState("checking");
      setHasResolvedInitialAccess(false);
      return;
    }

    if (!user?.$id || !workspace) {
      setState("visitor");
      setHasResolvedInitialAccess(true);
      return;
    }

    if (workspace.ownerId === user.$id) {
      setState("member");
      setHasResolvedInitialAccess(true);
      return;
    }

    if (!workspace.teamId) {
      setState((prev) => (prev === "invited" ? "invited" : "visitor"));
      setHasResolvedInitialAccess(true);
      return;
    }

    try {
      const response = await teams.listMemberships(workspace.teamId);
      const mine = response.memberships.find(
        (membership: any) => membership.userId === user.$id
      );

      if (!mine) {
        setState((prev) => (prev === "invited" ? "invited" : "visitor"));
        setHasResolvedInitialAccess(true);
        return;
      }

      if (mine.confirm) {
        setState("member");
        setHasResolvedInitialAccess(true);
        return;
      }

      setState("invited");
      setHasResolvedInitialAccess(true);
    } catch (error) {
      console.error("Membership check failed:", error);
      setState((prev) => (prev === "invited" ? "invited" : "visitor"));
      setHasResolvedInitialAccess(true);
    }
  }, [workspaceId, user?.$id, workspace]);

  useEffect(() => {
    if (isWorkspaceLoading) return;
    void checkMembership();
  }, [isWorkspaceLoading, checkMembership]);

  useEffect(() => {
    if (!provider || !user?.$id) return;

    const handleAwareness = ({
      states,
    }: {
      states: Map<number, Record<string, any>>;
    }) => {
      for (const stateValue of states.values()) {
        const signal = getInviteSignal(stateValue?.user);

        if (!signal) continue;
        if (signal.targetUserId !== user.$id) continue;
        if (processedInviteTokenRef.current === signal.token) continue;

        processedInviteTokenRef.current = signal.token;
        setState((prev) => (prev === "member" ? "member" : "invited"));
      }
    };

    provider.on("awarenessUpdate", handleAwareness);
    provider.on("awarenessChange", handleAwareness);

    handleAwareness({
      states: provider.awareness.getStates() as Map<number, Record<string, any>>,
    });

    return () => {
      provider.off("awarenessUpdate", handleAwareness);
      provider.off("awarenessChange", handleAwareness);
    };
  }, [provider, user?.$id]);

  useEffect(() => {
    if (!workspace?.teamId) return;
    if (!membershipId || !secret) return;
    if (!user?.$id && !userId) return;
    if (isConfirmingRef.current) return;

    if (workspace.ownerId === user?.$id) {
      clearInviteParams();
      setState("member");
      setHasResolvedInitialAccess(true);
      return;
    }

    isConfirmingRef.current = true;
    setState("checking");
    setHasResolvedInitialAccess(false);

    const confirmInvite = async () => {
      try {
        await teams.updateMembershipStatus(
          workspace.teamId,
          membershipId,
          userId ?? user!.$id,
          secret
        );

        clearInviteParams();
        await checkMembership();
      } catch (error) {
        console.error("Membership confirmation failed:", error);

        const appwriteError = error as AppwriteException;
        clearInviteParams();

        if (appwriteError?.type === "team_invalid_secret") {
          setState("invite-invalid");
          setHasResolvedInitialAccess(true);
        } else {
          await checkMembership();
        }
      } finally {
        isConfirmingRef.current = false;
      }
    };

    void confirmInvite();
  }, [
    workspace,
    membershipId,
    userId,
    secret,
    user?.$id,
    clearInviteParams,
    checkMembership,
  ]);

  if (!workspaceId || isWorkspaceLoading || !hasResolvedInitialAccess || state === "checking") {
    return <CheckingAccessView />;
  }

  if (state === "invite-invalid") {
    return <InvalidInviteView />;
  }

  if (state === "visitor") {
    return <VisitorView />;
  }

  if (state === "invited") {
    return <InvitedView />;
  }

  return <>{children}</>;
}

export function LobbyGuard({ children }: { children: React.ReactNode }) {
  const workspaceId = useWorkspaceId();

  return (
    <LobbyGuardInner key={workspaceId ?? "no-workspace"}>
      {children}
    </LobbyGuardInner>
  );
}
