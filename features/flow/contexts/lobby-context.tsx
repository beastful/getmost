"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useWorkspace } from "@/features/dashboard/hooks/use-workspace";
import { useWorkspaceId } from "@/features/flow/hooks/use-workspace-id";
import { teams } from "@/lib/appwrite";

export interface InviteSignal {
  targetUserId: string;
  token: string;
  sentAt: number;
}

export interface LobbyUser {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteSignal?: InviteSignal | null;
}

export interface LobbyVisitor {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteStatus: "idle" | "sending" | "sent";
}

interface LobbyContextValue {
  provider: HocuspocusProvider | null;
  connected: boolean;
  self: LobbyUser | null;
  visitors: LobbyVisitor[];
  isOwner: boolean;
  sendInvite: (visitor: LobbyVisitor) => Promise<void>;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInviteToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeLobbyUser(value: unknown): LobbyUser | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<LobbyUser>;

  if (
    typeof raw.userId !== "string" ||
    typeof raw.sessionId !== "string" ||
    typeof raw.email !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.joinedAt !== "number"
  ) {
    return null;
  }

  return {
    userId: raw.userId,
    sessionId: raw.sessionId,
    email: raw.email,
    name: raw.name,
    joinedAt: raw.joinedAt,
    inviteSignal: raw.inviteSignal ?? null,
  };
}

const LobbyContext = createContext<LobbyContextValue | null>(null);

export function LobbyProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = useWorkspaceId();
  const { data: workspace } = useWorkspace(workspaceId);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [self, setSelf] = useState<LobbyUser | null>(null);
  const [visitors, setVisitors] = useState<LobbyVisitor[]>([]);

  const sessionIdRef = useRef(createSessionId());
  const selfRef = useRef<LobbyUser | null>(null);

  const isOwner = workspace?.ownerId === user?.$id;

  useEffect(() => {
    if (!workspaceId || !user?.$id || !user.email) return;

    const ydoc = new Y.Doc();

    const nextProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL!,
      name: `workspace-${workspaceId}-lobby`,
      document: ydoc,
      onConnect: () => {
        setConnected(true);

        const nextSelf: LobbyUser = {
          userId: user.$id,
          sessionId: sessionIdRef.current,
          email: user.email,
          name: user.name?.trim() || user.email.split("@")[0] || "User",
          joinedAt: selfRef.current?.joinedAt ?? Date.now(),
          inviteSignal: null,
        };

        selfRef.current = nextSelf;
        setSelf(nextSelf);
        nextProvider.setAwarenessField("user", nextSelf);
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onClose: () => {
        setConnected(false);
      },
    });

    const syncVisitors = (states: Map<number, Record<string, any>>) => {
      const users = Array.from(states.values())
        .map((state) => normalizeLobbyUser(state?.user))
        .filter((value): value is LobbyUser => !!value)
        .filter((value) => value.userId !== user.$id)
        .sort((a, b) => a.joinedAt - b.joinedAt);

      setVisitors((prev) => {
        const inviteStateMap = new Map(
          prev.map((visitor) => [
            `${visitor.userId}:${visitor.sessionId}`,
            visitor.inviteStatus,
          ])
        );

        return users.map((value) => ({
          userId: value.userId,
          sessionId: value.sessionId,
          email: value.email,
          name: value.name,
          joinedAt: value.joinedAt,
          inviteStatus:
            inviteStateMap.get(`${value.userId}:${value.sessionId}`) ?? "idle",
        }));
      });
    };

    const handleAwareness = ({
      states,
    }: {
      states: Map<number, Record<string, any>>;
    }) => {
      syncVisitors(states);
    };

    nextProvider.on("awarenessUpdate", handleAwareness);
    nextProvider.on("awarenessChange", handleAwareness);

    setProvider(nextProvider);

    return () => {
      nextProvider.off("awarenessUpdate", handleAwareness);
      nextProvider.off("awarenessChange", handleAwareness);
      nextProvider.destroy();
      ydoc.destroy();

      selfRef.current = null;
      setProvider(null);
      setConnected(false);
      setSelf(null);
      setVisitors([]);
    };
  }, [workspaceId, user?.$id, user?.email, user?.name]);

  const broadcastInviteSignal = useCallback((targetUserId: string) => {
    if (!provider || !selfRef.current) return;

    const nextSelf: LobbyUser = {
      ...selfRef.current,
      inviteSignal: {
        targetUserId,
        token: createInviteToken(),
        sentAt: Date.now(),
      },
    };

    selfRef.current = nextSelf;
    setSelf(nextSelf);
    provider.setAwarenessField("user", nextSelf);

    window.setTimeout(() => {
      if (!provider || !selfRef.current) return;

      const clearedSelf: LobbyUser = {
        ...selfRef.current,
        inviteSignal: null,
      };

      selfRef.current = clearedSelf;
      setSelf(clearedSelf);
      provider.setAwarenessField("user", clearedSelf);
    }, 5000);
  }, [provider]);

  const sendInvite = useCallback(
    async (visitor: LobbyVisitor) => {
      if (!workspace?.teamId || !isOwner) return;

      setVisitors((prev) =>
        prev.map((value) =>
          value.userId === visitor.userId && value.sessionId === visitor.sessionId
            ? { ...value, inviteStatus: "sending" }
            : value
        )
      );

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("membershipId");
        url.searchParams.delete("userId");
        url.searchParams.delete("secret");
        url.searchParams.delete("expire");

        await teams.createMembership(
          workspace.teamId,
          ["member"],
          visitor.email,
          visitor.userId,
          undefined,
          url.toString(),
          visitor.name?.trim() || visitor.email.split("@")[0] || "User"
        );

        broadcastInviteSignal(visitor.userId);

        setVisitors((prev) =>
          prev.map((value) =>
            value.userId === visitor.userId && value.sessionId === visitor.sessionId
              ? { ...value, inviteStatus: "sent" }
              : value
          )
        );
      } catch (error) {
        console.error("Failed to send invite:", error);

        setVisitors((prev) =>
          prev.map((value) =>
            value.userId === visitor.userId && value.sessionId === visitor.sessionId
              ? { ...value, inviteStatus: "idle" }
              : value
          )
        );
      }
    },
    [workspace?.teamId, isOwner, broadcastInviteSignal]
  );

  const value = useMemo<LobbyContextValue>(
    () => ({
      provider,
      connected,
      self,
      visitors,
      isOwner: !!isOwner,
      sendInvite,
    }),
    [provider, connected, self, visitors, isOwner, sendInvite]
  );

  return (
    <LobbyContext.Provider value={value}>
      {children}
    </LobbyContext.Provider>
  );
}

export function useLobby() {
  const context = useContext(LobbyContext);

  if (!context) {
    throw new Error("useLobby must be used inside LobbyProvider");
  }

  return context;
}
