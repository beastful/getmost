'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useRef,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useWorkspace } from '@/features/dashboard/hooks/use-workspace';
import { teams, client } from '@/lib/appwrite';
import { Mail, ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

const HOCUSPOCUS_URL = 'wss://ez5c0rv0qswls1v5jm2yzvdc.getmost.app';

function useUrlParams() {
  const params = useSearchParams();

  return useMemo(
    () => ({
      workspaceId: params.get('id'),
      membershipId: params.get('membershipId') ?? params.get('userId'),
      secret: params.get('secret'),
    }),
    [params]
  );
}

interface InviteSignal {
  targetUserId: string;
  token: string;
  sentAt: number;
}

export interface UserAwareness {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteSignal?: InviteSignal | null;
}

interface Visitor {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteStatus: 'idle' | 'sending' | 'sent';
}

type MembershipState = 'checking' | 'visitor' | 'invited' | 'member';

interface LobbyContextValue {
  provider: HocuspocusProvider | null;
  connected: boolean;
  selfAwareness: UserAwareness | null;
}

function createSessionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInviteToken() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeAwarenessUser(value: unknown): UserAwareness | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<UserAwareness>;

  if (
    typeof raw.userId !== 'string' ||
    typeof raw.sessionId !== 'string' ||
    typeof raw.email !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.joinedAt !== 'number'
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

function useLobbyProvider() {
  const user = useAuthStore((s) => s.user);
  const { workspaceId } = useUrlParams();

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);

  const sessionIdRef = useRef<string>(createSessionId());
  const awarenessBaseRef = useRef<UserAwareness | null>(null);

  useEffect(() => {
    if (!workspaceId || !user?.$id || !user.email) return;

    const ydoc = new Y.Doc();

    const buildSelfAwareness = (override?: Partial<UserAwareness>): UserAwareness => ({
      userId: user.$id,
      sessionId: sessionIdRef.current,
      email: user.email,
      name: user.name?.trim() || user.email.split('@')[0] || 'User',
      joinedAt: override?.joinedAt ?? awarenessBaseRef.current?.joinedAt ?? Date.now(),
      inviteSignal:
        override && 'inviteSignal' in override
          ? override.inviteSignal ?? null
          : awarenessBaseRef.current?.inviteSignal ?? null,
    });

    const p = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: `workspace-${workspaceId}-lobby`,
      document: ydoc,
      onConnect: () => {
        setConnected(true);
        const next = buildSelfAwareness({ inviteSignal: null });
        awarenessBaseRef.current = next;
        p.setAwarenessField('user', next);
      },
      onDisconnect: () => setConnected(false),
      onClose: () => setConnected(false),
    });

    setProvider(p);

    return () => {
      setConnected(false);
      awarenessBaseRef.current = null;
      p.destroy();
      ydoc.destroy();
      setProvider(null);
    };
  }, [workspaceId, user?.$id, user?.email, user?.name]);

  const selfAwareness = useMemo(() => awarenessBaseRef.current, [provider, connected]);

  return { provider, connected, selfAwareness };
}

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const lobby = useLobbyProvider();
  return <LobbyContext.Provider value={lobby}>{children}</LobbyContext.Provider>;
}

function useLobby() {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error('useLobby must be inside CollaborationProvider');
  return ctx;
}

export function VisitorManager() {
  const user = useAuthStore((s) => s.user);
  const { workspaceId } = useUrlParams();
  const { data: workspace } = useWorkspace(workspaceId);
  const { provider: lobbyProvider, connected, selfAwareness } = useLobby();

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const isOwner = workspace?.ownerId === user?.$id;

  useEffect(() => {
    if (!isOwner || !lobbyProvider || !user?.$id) return;

    const updateVisitorsFromStates = (states: Map<number, Record<string, any>>) => {
      const users = Array.from(states.values())
        .map((s) => normalizeAwarenessUser(s?.user))
        .filter((u): u is UserAwareness => !!u)
        .filter((u) => u.userId !== user.$id)
        .sort((a, b) => a.joinedAt - b.joinedAt);

      setVisitors((prev) => {
        const previous = new Map(prev.map((v) => [`${v.userId}:${v.sessionId}`, v.inviteStatus]));

        return users.map((u) => ({
          userId: u.userId,
          sessionId: u.sessionId,
          email: u.email,
          name: u.name,
          joinedAt: u.joinedAt,
          inviteStatus: previous.get(`${u.userId}:${u.sessionId}`) ?? 'idle',
        }));
      });
    };

    const handleAwareness = ({ states }: { states: Map<number, Record<string, any>> }) => {
      updateVisitorsFromStates(states);
    };

    lobbyProvider.on('awarenessUpdate', handleAwareness);
    lobbyProvider.on('awarenessChange', handleAwareness);

    updateVisitorsFromStates(
      lobbyProvider.awareness.getStates() as Map<number, Record<string, any>>
    );

    return () => {
      lobbyProvider.off('awarenessUpdate', handleAwareness);
      lobbyProvider.off('awarenessChange', handleAwareness);
    };
  }, [lobbyProvider, isOwner, user?.$id]);

  const broadcastInviteSignal = useCallback(
    (targetUserId: string) => {
      if (!lobbyProvider || !selfAwareness) return;

      const nextAwareness: UserAwareness = {
        ...selfAwareness,
        inviteSignal: {
          targetUserId,
          token: createInviteToken(),
          sentAt: Date.now(),
        },
      };

      lobbyProvider.setAwarenessField('user', nextAwareness);

      window.setTimeout(() => {
        lobbyProvider.setAwarenessField('user', {
          ...nextAwareness,
          inviteSignal: null,
        });
      }, 5000);
    },
    [lobbyProvider, selfAwareness]
  );

  const sendInvite = useCallback(
    async (visitor: Visitor) => {
      if (!workspace?.teamId) return;

      setVisitors((prev) =>
        prev.map((v) =>
          v.userId === visitor.userId && v.sessionId === visitor.sessionId
            ? { ...v, inviteStatus: 'sending' }
            : v
        )
      );

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('membershipId');
        url.searchParams.delete('userId');
        url.searchParams.delete('secret');
        const redirectUrl = url.toString();

        await teams.createMembership(
          workspace.teamId,
          ['member'],
          visitor.email,
          visitor.userId,
          undefined,
          redirectUrl,
          visitor.name?.trim() || visitor.email.split('@')[0] || 'User'
        );

        broadcastInviteSignal(visitor.userId);

        setVisitors((prev) =>
          prev.map((v) =>
            v.userId === visitor.userId && v.sessionId === visitor.sessionId
              ? { ...v, inviteStatus: 'sent' }
              : v
          )
        );
      } catch (error) {
        console.error('Failed to send invite', error);

        setVisitors((prev) =>
          prev.map((v) =>
            v.userId === visitor.userId && v.sessionId === visitor.sessionId
              ? { ...v, inviteStatus: 'idle' }
              : v
          )
        );
      }
    },
    [workspace?.teamId, broadcastInviteSignal]
  );

  if (!isOwner) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="gap-2">
          <Users className="size-4" />
          Гости
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {visitors.length}
          </span>
          <ChevronDown className="size-4 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-[360px] p-0">
        <div className="px-3 py-2">
          <DropdownMenuLabel className="px-0 pb-0 text-sm font-semibold">Гости</DropdownMenuLabel>
          <p className="mt-1 text-xs text-slate-500">
            {connected ? 'Live lobby connected' : 'Lobby reconnecting...'}
          </p>
        </div>

        <DropdownMenuSeparator />

        {visitors.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-slate-400">
            No one is viewing this workspace right now
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="p-2">
              {visitors.map((visitor) => {
                const initials =
                  visitor.name?.charAt(0)?.toUpperCase() ?? visitor.email.charAt(0).toUpperCase();

                return (
                  <div
                    key={`${visitor.userId}:${visitor.sessionId}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {visitor.name || visitor.email}
                        </p>
                        <p className="truncate text-xs text-slate-500">{visitor.email}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={visitor.inviteStatus === 'sent' ? 'secondary' : 'default'}
                      disabled={visitor.inviteStatus === 'sending'}
                      onClick={() => sendInvite(visitor)}
                      className="h-8 gap-1.5"
                    >
                      <Mail className="size-3.5" />
                      {visitor.inviteStatus === 'sending'
                        ? 'Sending...'
                        : visitor.inviteStatus === 'sent'
                        ? 'Send again'
                        : 'Invite'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TeamGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { workspaceId, membershipId, secret } = useUrlParams();
  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(workspaceId);
  const { provider: lobbyProvider } = useLobby();

  const [state, setState] = useState<MembershipState>('checking');
  const processedInviteTokenRef = useRef<string | null>(null);

  const checkMembership = useCallback(async () => {
    if (!user || !workspace?.teamId) return;

    try {
      const { memberships } = await teams.listMemberships(workspace.teamId);
      const mine = memberships.find((m: any) => m.userId === user.$id);

      if (!mine) {
        setState((prev) => (prev === 'invited' ? 'invited' : 'visitor'));
      } else if (mine.confirm) {
        setState('member');
      } else {
        setState('invited');
      }
    } catch (error) {
      console.error('Membership check failed', error);
      setState((prev) => (prev === 'invited' ? 'invited' : 'visitor'));
    }
  }, [user, workspace?.teamId]);

  useEffect(() => {
    if (isWorkspaceLoading) return;
    checkMembership();
  }, [checkMembership, isWorkspaceLoading]);

  useEffect(() => {
    if (!workspace?.teamId || !user) return;

    const unsub = client.subscribe(`teams.${workspace.teamId}`, (response: any) => {
      if (response.payload?.userId === user.$id) {
        checkMembership();
      }
    });

    return () => unsub();
  }, [workspace?.teamId, user, checkMembership]);

  useEffect(() => {
    if (!lobbyProvider || !user?.$id) return;

    const handleAwareness = ({ states }: { states: Map<number, Record<string, any>> }) => {
      for (const stateValue of states.values()) {
        const awarenessUser = normalizeAwarenessUser(stateValue?.user);
        const signal = awarenessUser?.inviteSignal;

        if (!signal) continue;
        if (signal.targetUserId !== user.$id) continue;
        if (processedInviteTokenRef.current === signal.token) continue;

        processedInviteTokenRef.current = signal.token;
        setState((prev) => (prev === 'member' ? prev : 'invited'));
      }
    };

    lobbyProvider.on('awarenessUpdate', handleAwareness);
    lobbyProvider.on('awarenessChange', handleAwareness);

    handleAwareness({
      states: lobbyProvider.awareness.getStates() as Map<number, Record<string, any>>,
    });

    return () => {
      lobbyProvider.off('awarenessUpdate', handleAwareness);
      lobbyProvider.off('awarenessChange', handleAwareness);
    };
  }, [lobbyProvider, user?.$id]);

  useEffect(() => {
    if (!user || !workspace?.teamId) return;
    if (!membershipId || !secret) return;

    const confirm = async () => {
      try {
        await teams.updateMembershipStatus(workspace.teamId, membershipId, user.$id, secret);

        const url = new URL(window.location.href);
        url.searchParams.delete('membershipId');
        url.searchParams.delete('userId');
        url.searchParams.delete('secret');
        window.history.replaceState({}, '', url.toString());

        checkMembership();
      } catch (error) {
        console.error('Membership confirmation failed', error);
      }
    };

    confirm();
  }, [user, workspace?.teamId, membershipId, secret, checkMembership]);

  if (isWorkspaceLoading || state === 'checking') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="text-sm text-slate-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (state === 'visitor') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Access required</h2>
          <p className="mt-2 text-sm text-slate-500">
            You are viewing this workspace as a visitor. Wait for the owner to send you an invitation.
          </p>
        </div>
      </div>
    );
  }

  if (state === 'invited') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Invitation received</h2>
          <p className="mt-2 text-sm text-slate-500">
            Please check your email at <span className="font-medium text-slate-700">{user?.email}</span> and confirm the invite.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
