'use client';

import * as React from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  Panel,
  useNodeId,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type XYPosition,
  type Viewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Copy,
  File,
  LineChart,
  Mail,
  Plug,
  RotateCcw,
  Save,
  Search,
  Star,
  Trash,
  User,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/auth-store';
import { useWorkspace } from '@/features/dashboard/hooks/use-workspace';
import { teams } from '@/lib/appwrite';
import { useUpdateEntity } from '@/features/project/hooks/use-update-entity';
import { useEntity } from '@/features/project/hooks/use-entity';
import { useEntities } from '@/features/project/hooks/use-entities';
import { useCreateEntity } from '@/features/project/hooks/use-create-entity';

type MetadataSyncMode = 'db' | 'yjs';

type NodePort = {
  id: string;
  name: string;
};

export type TemplateValue = unknown;

export type NodeTemplateContext = {
  nodeId: string;
  getInput: (inputId: string) => TemplateValue;
  getState: (key: string) => unknown;
};

export type NodeVisualContext = {
  nodeId: string;
  state: Record<string, any>;
  setState: (key: string, value: unknown) => void;
  getInput: (inputId: string) => TemplateValue;
};

export type NodeDefinition = {
  id: string;
  name: string;
  category: string;
  description?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  defaultState: Record<string, any>;
  template: (ctx: NodeTemplateContext) => TemplateValue;
  Visual: React.ComponentType<NodeVisualContext>;
};

export type EditorNodeData = {
  _definition: {
    id: string;
    inputs: NodePort[];
    outputs: NodePort[];
  };
  inputs: NodePort[];
  outputs: NodePort[];
  state: Record<string, any>;
  label: string;
};

export type FlowNode = Node<EditorNodeData>;
export type FlowEdge = Edge;

type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

type EntityRecord = {
  $id: string;
  name: string;
  data: string;
  metadata: string;
  workspaceId?: string;
  editor?: string;
  description?: string;
  folders?: string[];
  public?: boolean;
  featured?: boolean;
  store?: boolean;
  price?: number;
  teamId?: string;
  ownerId?: string;
};

type SyncedNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: EditorNodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
};

type SyncedEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
  data?: unknown;
  selected?: boolean;
};

type PresenceCursor = {
  x: number;
  y: number;
  viewport: Viewport | null;
  updatedAt: number;
};

type InviteSignal = {
  targetUserId: string;
  token: string;
  sentAt: number;
};

type PresenceUser = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  color: string;
  joinedAt: number;
};

type LobbyUser = PresenceUser & {
  inviteSignal?: InviteSignal | null;
};

type LobbyVisitor = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  joinedAt: number;
  inviteStatus: 'idle' | 'sending' | 'sent';
};

type RemotePresence = {
  clientId: number;
  user: PresenceUser;
  cursor: PresenceCursor | null;
  selection: {
    nodeIds?: string[];
    edgeIds?: string[];
  } | null;
};

type FlowDocumentStatus = 'idle' | 'connecting' | 'connected' | 'synced' | 'error';

type RoomContextValue = {
  roomId: string | null;
  setRoomId: (roomId: string | null) => void;
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
};

type LobbyContextValue = {
  provider: HocuspocusProvider | null;
  connected: boolean;
  self: LobbyUser | null;
  visitors: LobbyVisitor[];
  isOwner: boolean;
  sendInvite: (visitor: LobbyVisitor) => Promise<void>;
};

type FlowDocumentController = {
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc | null;
  graph: FlowGraph;
  nodes: FlowNode[];
  edges: FlowEdge[];
  presences: RemotePresence[];
  status: FlowDocumentStatus;
  persistStatus: 'idle' | 'saving' | 'saved' | 'error';
  roomName: string | null;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeState: (nodeId: string, patch: Record<string, unknown>) => void;
  addNode: (definitionId: string, position?: XYPosition) => void;
  addNodeAtCenter: (definitionId: string) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;
  saveNow: () => Promise<void>;
  setCenterResolver: (resolver: (() => XYPosition) | null) => void;
};

type MembershipState =
  | 'checking'
  | 'visitor'
  | 'invited'
  | 'member'
  | 'invite-invalid';

const RoomContext = React.createContext<RoomContextValue | null>(null);
const LobbyContext = React.createContext<LobbyContextValue | null>(null);
const FlowDocumentContext = React.createContext<FlowDocumentController | null>(null);

function useWorkspaceId(): string | null {
  const searchParams = useSearchParams();
  return searchParams.get('id');
}

function useInviteParams() {
  const searchParams = useSearchParams();
  return {
    membershipId: searchParams.get('membershipId'),
    userId: searchParams.get('userId'),
    secret: searchParams.get('secret'),
    expire: searchParams.get('expire'),
  };
}

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeMetadata(metadata: string): { sync?: MetadataSyncMode } {
  try {
    const parsed = JSON.parse(metadata || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as { sync?: MetadataSyncMode };
  } catch {
    return {};
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInviteToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `invite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createColorFromString(input: string) {
  const palette = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectUpstreamNodeIds(startNodeId: string, edges: { source: string; target: string }[]) {
  const visited = new Set<string>();
  const stack = [startNodeId];

  while (stack.length) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const edge of edges) {
      if (edge.target === current && !visited.has(edge.source)) {
        stack.push(edge.source);
      }
    }
  }

  return visited;
}

function toSyncedNode(node: FlowNode): SyncedNode {
  return {
    id: String(node.id),
    type: node.type,
    position: {
      x: Number(node.position?.x ?? 0),
      y: Number(node.position?.y ?? 0),
    },
    data: toPlain(node.data),
    width: typeof node.width === 'number' ? node.width : undefined,
    height: typeof node.height === 'number' ? node.height : undefined,
    selected: !!node.selected,
    dragging: !!node.dragging,
  };
}

function fromSyncedNode(node: SyncedNode): FlowNode {
  return {
    id: node.id,
    type: node.type ?? 'customNode',
    position: node.position ?? { x: 0, y: 0 },
    data: node.data,
    width: node.width,
    height: node.height,
    selected: !!node.selected,
    dragging: !!node.dragging,
  };
}

function toSyncedEdge(edge: FlowEdge): SyncedEdge {
  return {
    id: String(edge.id),
    source: String(edge.source),
    target: String(edge.target),
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    type: edge.type,
    animated: !!edge.animated,
    data: edge.data != null ? toPlain(edge.data) : undefined,
    selected: !!edge.selected,
  };
}

function fromSyncedEdge(edge: SyncedEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    type: edge.type,
    animated: !!edge.animated,
    data: edge.data as FlowEdge['data'],
    selected: !!edge.selected,
  };
}

function ensureMaps(doc: Y.Doc) {
  const root = doc.getMap('flow');

  let nodes = root.get('nodes');
  if (!(nodes instanceof Y.Map)) {
    nodes = new Y.Map<SyncedNode>();
    root.set('nodes', nodes);
  }

  let edges = root.get('edges');
  if (!(edges instanceof Y.Map)) {
    edges = new Y.Map<SyncedEdge>();
    root.set('edges', edges);
  }

  let meta = root.get('meta');
  if (!(meta instanceof Y.Map)) {
    meta = new Y.Map<any>();
    root.set('meta', meta);
  }

  return {
    root,
    nodes: nodes as Y.Map<SyncedNode>,
    edges: edges as Y.Map<SyncedEdge>,
    meta: meta as Y.Map<any>,
  };
}

function readNodes(yNodes: Y.Map<SyncedNode>): FlowNode[] {
  return Array.from(yNodes.values())
    .map(fromSyncedNode)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function readEdges(yEdges: Y.Map<SyncedEdge>): FlowEdge[] {
  return Array.from(yEdges.values())
    .map(fromSyncedEdge)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function graphFromDoc(yNodes: Y.Map<SyncedNode>, yEdges: Y.Map<SyncedEdge>): FlowGraph {
  return {
    nodes: readNodes(yNodes),
    edges: readEdges(yEdges),
  };
}

function syncNodesToYjs(yNodes: Y.Map<SyncedNode>, nextNodes: FlowNode[]) {
  const nextIds = new Set(nextNodes.map((n) => String(n.id)));

  for (const id of Array.from(yNodes.keys())) {
    if (!nextIds.has(id)) yNodes.delete(id);
  }

  for (const node of nextNodes) {
    yNodes.set(String(node.id), toSyncedNode(node));
  }
}

function syncEdgesToYjs(yEdges: Y.Map<SyncedEdge>, nextEdges: FlowEdge[]) {
  const nextIds = new Set(nextEdges.map((e) => String(e.id)));

  for (const id of Array.from(yEdges.keys())) {
    if (!nextIds.has(id)) yEdges.delete(id);
  }

  for (const edge of nextEdges) {
    yEdges.set(String(edge.id), toSyncedEdge(edge));
  }
}

function parseEntityGraph(entity: EntityRecord | null): FlowGraph {
  if (!entity) return { nodes: [], edges: [] };
  const parsed = safeParseJson<any>(entity.data, { nodes: [], edges: [] });
  return {
    nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
    edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
  };
}

function serializeGraph(graph: FlowGraph) {
  return JSON.stringify({
    nodes: graph.nodes,
    edges: graph.edges,
  });
}

function bootstrapSeedIntoDoc(
  entity: EntityRecord | null,
  yNodes: Y.Map<SyncedNode>,
  yEdges: Y.Map<SyncedEdge>,
  yMeta: Y.Map<any>
) {
  const hasNodes = yNodes.size > 0;
  const hasEdges = yEdges.size > 0;

  if (hasNodes || hasEdges) {
    yMeta.set('bootstrapped', true);
    return;
  }

  const seed = parseEntityGraph(entity);

  for (const node of seed.nodes) {
    yNodes.set(String(node.id), toSyncedNode(node));
  }

  for (const edge of seed.edges) {
    yEdges.set(String(edge.id), toSyncedEdge(edge));
  }

  yMeta.set('bootstrapped', true);
}

export function evaluateNode(
  nodeId: string,
  outputId = 'out',
  graph: FlowGraph,
  cache = new Map<string, unknown>(),
  visiting = new Set<string>()
): unknown {
  const cacheKey = `${nodeId}:${outputId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (visiting.has(cacheKey)) {
    return ['error', 'cycle-detected', nodeId, outputId];
  }

  visiting.add(cacheKey);

  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const definition = NODE_REGISTRY_MAP[node.data._definition.id];
  if (!definition) return null;

  const getInput = (inputId: string) => {
    const edge = graph.edges.find((e) => e.target === nodeId && e.targetHandle === inputId);
    if (!edge?.source) return null;
    return evaluateNode(edge.source, edge.sourceHandle ?? 'out', graph, cache, visiting);
  };

  const getState = (key: string) => node.data.state?.[key];

  const result = definition.template({
    nodeId,
    getInput,
    getState,
  });

  visiting.delete(cacheKey);
  cache.set(cacheKey, result);
  return result;
}

function createNodeInstance(definitionId: string, position = { x: 300, y: 200 }): FlowNode {
  const definition = NODE_REGISTRY_MAP[definitionId];

  if (!definition) {
    throw new Error(`Unknown node definition: ${definitionId}`);
  }

  const inputs = definition.inputs.map((i) => ({ ...i }));
  const outputs = definition.outputs.map((o) => ({ ...o }));

  return {
    id: crypto.randomUUID(),
    position,
    data: {
      _definition: {
        id: definition.id,
        inputs,
        outputs,
      },
      inputs,
      outputs,
      state: { ...definition.defaultState },
      label: definition.name,
    },
    type: 'customNode',
  };
}

function useRoom() {
  const context = React.useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

function useLobby() {
  const context = React.useContext(LobbyContext);
  if (!context) {
    throw new Error('useLobby must be used inside LobbyProvider');
  }
  return context;
}

function useFlowDocument() {
  const context = React.useContext(FlowDocumentContext);
  if (!context) {
    throw new Error('useFlowDocument must be used inside FlowDocumentProvider');
  }
  return context;
}

function RoomProvider({ children }: { children: React.ReactNode }) {
  const [roomId, setRoomId] = React.useState<string | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  const value = React.useMemo(
    () => ({
      roomId,
      setRoomId,
      isConnected,
      setIsConnected,
    }),
    [roomId, isConnected]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

function normalizeLobbyUser(value: unknown): LobbyUser | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<LobbyUser>;

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
    color:
      typeof (raw as any).color === 'string'
        ? (raw as any).color
        : createColorFromString(raw.userId),
    inviteSignal: raw.inviteSignal ?? null,
  };
}

function LobbyProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s: any) => s.user);
  const workspaceId = useWorkspaceId();
  const { data: workspace } = useWorkspace(workspaceId);

  const [provider, setProvider] = React.useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = React.useState(false);
  const [self, setSelf] = React.useState<LobbyUser | null>(null);
  const [visitors, setVisitors] = React.useState<LobbyVisitor[]>([]);

  const sessionIdRef = React.useRef(createSessionId());
  const selfRef = React.useRef<LobbyUser | null>(null);

  const isOwner = workspace?.ownerId === user?.$id;

  React.useEffect(() => {
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
          name: user.name?.trim() || user.email.split('@')[0] || 'User',
          joinedAt: selfRef.current?.joinedAt ?? Date.now(),
          color: createColorFromString(user.$id),
          inviteSignal: null,
        };

        selfRef.current = nextSelf;
        setSelf(nextSelf);
        nextProvider.setAwarenessField('user', nextSelf);
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
            inviteStateMap.get(`${value.userId}:${value.sessionId}`) ?? 'idle',
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

    nextProvider.on('awarenessUpdate', handleAwareness);
    nextProvider.on('awarenessChange', handleAwareness);

    setProvider(nextProvider);

    return () => {
      nextProvider.off('awarenessUpdate', handleAwareness);
      nextProvider.off('awarenessChange', handleAwareness);
      nextProvider.destroy();
      ydoc.destroy();

      selfRef.current = null;
      setProvider(null);
      setConnected(false);
      setSelf(null);
      setVisitors([]);
    };
  }, [workspaceId, user?.$id, user?.email, user?.name]);

  const broadcastInviteSignal = React.useCallback((targetUserId: string) => {
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
    provider.setAwarenessField('user', nextSelf);

    window.setTimeout(() => {
      if (!provider || !selfRef.current) return;

      const clearedSelf: LobbyUser = {
        ...selfRef.current,
        inviteSignal: null,
      };

      selfRef.current = clearedSelf;
      setSelf(clearedSelf);
      provider.setAwarenessField('user', clearedSelf);
    }, 5000);
  }, [provider]);

  const sendInvite = React.useCallback(
    async (visitor: LobbyVisitor) => {
      if (!workspace?.teamId || !isOwner) return;

      setVisitors((prev) =>
        prev.map((value) =>
          value.userId === visitor.userId && value.sessionId === visitor.sessionId
            ? { ...value, inviteStatus: 'sending' }
            : value
        )
      );

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('membershipId');
        url.searchParams.delete('userId');
        url.searchParams.delete('secret');
        url.searchParams.delete('expire');

        await teams.createMembership(
          workspace.teamId,
          ['member'],
          visitor.email,
          visitor.userId,
          undefined,
          url.toString(),
          visitor.name?.trim() || visitor.email.split('@')[0] || 'User'
        );

        broadcastInviteSignal(visitor.userId);

        setVisitors((prev) =>
          prev.map((value) =>
            value.userId === visitor.userId && value.sessionId === visitor.sessionId
              ? { ...value, inviteStatus: 'sent' }
              : value
          )
        );

        toast.success(`Приглашение отправлено: ${visitor.email}`);
      } catch (error) {
        console.error('Failed to send invite:', error);

        setVisitors((prev) =>
          prev.map((value) =>
            value.userId === visitor.userId && value.sessionId === visitor.sessionId
              ? { ...value, inviteStatus: 'idle' }
              : value
          )
        );

        toast.error('Не удалось отправить приглашение');
      }
    },
    [workspace?.teamId, isOwner, broadcastInviteSignal]
  );

  const value = React.useMemo<LobbyContextValue>(
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

  return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>;
}

function getInviteSignal(value: unknown):
  | { targetUserId: string; token: string; sentAt: number }
  | null {
  if (!value || typeof value !== 'object') return null;

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
    typeof signal.targetUserId !== 'string' ||
    typeof signal.token !== 'string' ||
    typeof signal.sentAt !== 'number'
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
          <User className="h-6 w-6 text-slate-400" />
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
          <Mail className="h-6 w-6 text-amber-500" />
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
          <WifiOff className="h-6 w-6 text-rose-500" />
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
  const user = useAuthStore((s: any) => s.user);
  const workspaceId = useWorkspaceId();
  const { membershipId, userId, secret } = useInviteParams();
  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(workspaceId);
  const { provider } = useLobby();

  const [state, setState] = React.useState<MembershipState>('checking');
  const [hasResolvedInitialAccess, setHasResolvedInitialAccess] = React.useState(false);

  const processedInviteTokenRef = React.useRef<string | null>(null);
  const isConfirmingRef = React.useRef(false);

  const clearInviteParams = React.useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('membershipId');
    url.searchParams.delete('userId');
    url.searchParams.delete('secret');
    url.searchParams.delete('expire');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const checkMembership = React.useCallback(async () => {
    if (!workspaceId) {
      setState('checking');
      setHasResolvedInitialAccess(false);
      return;
    }

    if (!user?.$id || !workspace) {
      setState('visitor');
      setHasResolvedInitialAccess(true);
      return;
    }

    if (workspace.ownerId === user.$id) {
      setState('member');
      setHasResolvedInitialAccess(true);
      return;
    }

    if (!workspace.teamId) {
      setState((prev) => (prev === 'invited' ? 'invited' : 'visitor'));
      setHasResolvedInitialAccess(true);
      return;
    }

    try {
      const response = await teams.listMemberships(workspace.teamId);
      const mine = response.memberships.find(
        (membership: any) => membership.userId === user.$id
      );

      if (!mine) {
        setState((prev) => (prev === 'invited' ? 'invited' : 'visitor'));
        setHasResolvedInitialAccess(true);
        return;
      }

      if (mine.confirm) {
        setState('member');
        setHasResolvedInitialAccess(true);
        return;
      }

      setState('invited');
      setHasResolvedInitialAccess(true);
    } catch (error) {
      console.error('Membership check failed:', error);
      setState((prev) => (prev === 'invited' ? 'invited' : 'visitor'));
      setHasResolvedInitialAccess(true);
    }
  }, [workspaceId, user?.$id, workspace]);

  React.useEffect(() => {
    if (isWorkspaceLoading) return;
    void checkMembership();
  }, [isWorkspaceLoading, checkMembership]);

  React.useEffect(() => {
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
        setState((prev) => (prev === 'member' ? 'member' : 'invited'));
      }
    };

    provider.on('awarenessUpdate', handleAwareness);
    provider.on('awarenessChange', handleAwareness);

    handleAwareness({
      states: provider.awareness.getStates() as Map<number, Record<string, any>>,
    });

    return () => {
      provider.off('awarenessUpdate', handleAwareness);
      provider.off('awarenessChange', handleAwareness);
    };
  }, [provider, user?.$id]);

  React.useEffect(() => {
    if (!workspace?.teamId) return;
    if (!membershipId || !secret) return;
    if (!user?.$id && !userId) return;
    if (isConfirmingRef.current) return;

    if (workspace.ownerId === user?.$id) {
      clearInviteParams();
      setState('member');
      setHasResolvedInitialAccess(true);
      return;
    }

    isConfirmingRef.current = true;
    setState('checking');
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
      } catch (error: any) {
        console.error('Membership confirmation failed:', error);
        clearInviteParams();

        if (error?.type === 'team_invalid_secret') {
          setState('invite-invalid');
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

  if (!workspaceId || isWorkspaceLoading || !hasResolvedInitialAccess || state === 'checking') {
    return <CheckingAccessView />;
  }

  if (state === 'invite-invalid') {
    return <InvalidInviteView />;
  }

  if (state === 'visitor') {
    return <VisitorView />;
  }

  if (state === 'invited') {
    return <InvitedView />;
  }

  return <>{children}</>;
}

function LobbyGuard({ children }: { children: React.ReactNode }) {
  const workspaceId = useWorkspaceId();
  return <LobbyGuardInner key={workspaceId ?? 'no-workspace'}>{children}</LobbyGuardInner>;
}

function NumberNodeVisual({ state, setState }: NodeVisualContext) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">Value</div>
      <input
        className="nodrag w-full rounded-md border bg-background px-2 py-1 text-sm"
        value={String(state.value ?? '')}
        onChange={(e) => setState('value', e.target.value)}
      />
    </div>
  );
}

function useReactiveInput(inputId: string) {
  const nodeId = useNodeId();
  const { graph } = useFlowDocument();

  return React.useMemo(() => {
    if (!nodeId) return null;

    const inputEdge = graph.edges.find(
      (e) => e.target === nodeId && e.targetHandle === inputId
    );

    if (!inputEdge?.source) return null;

    const upstreamIds = collectUpstreamNodeIds(String(inputEdge.source), graph.edges);
    const scopedNodes = graph.nodes.filter((n) => upstreamIds.has(String(n.id)));
    const scopedEdges = graph.edges.filter(
      (e) => upstreamIds.has(String(e.source)) || upstreamIds.has(String(e.target))
    );

    return evaluateNode(String(inputEdge.source), inputEdge.sourceHandle ?? 'out', {
      nodes: scopedNodes,
      edges: scopedEdges,
    });
  }, [nodeId, inputId, graph]);
}

function SumNodeVisual({ getInput }: NodeVisualContext) {
  const inp1 = useReactiveInput('inp1');
  const inp2 = useReactiveInput('inp2');

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          toast(JSON.stringify(getInput('inp1')));
        }}
      >
        Alert value
      </Button>
      <div>inp1: {JSON.stringify(inp1)}</div>
      <div>inp2: {JSON.stringify(inp2)}</div>
    </div>
  );
}

const NODE_REGISTRY: NodeDefinition[] = [
  {
    id: 'number',
    name: 'Number',
    category: 'Basic',
    description: 'Primitive number value',
    inputs: [],
    outputs: [{ id: 'out', name: 'Value' }],
    defaultState: { value: 42 },
    template: ({ getState }) => ['number', getState('value')],
    Visual: NumberNodeVisual,
  },
  {
    id: 'sum',
    name: 'Sum',
    category: 'Basic',
    description: 'Sum of two values',
    inputs: [
      { id: 'inp1', name: 'Value 1' },
      { id: 'inp2', name: 'Value 2' },
    ],
    outputs: [{ id: 'out', name: 'Value' }],
    defaultState: {},
    template: ({ getInput }) => ['sum', getInput('inp1'), getInput('inp2')],
    Visual: SumNodeVisual,
  },
];

const NODE_REGISTRY_MAP = Object.fromEntries(
  NODE_REGISTRY.map((node) => [node.id, node])
) as Record<string, NodeDefinition>;

function CustomNode({ id, data }: NodeProps<FlowNode>) {
  const { updateNodeState, graph } = useFlowDocument();
  const definition = NODE_REGISTRY_MAP[data._definition.id];

  if (!definition) {
    return (
      <div className="rounded-lg border bg-background p-3 text-sm text-destructive">
        Unknown node type: {data._definition.id}
      </div>
    );
  }

  const inputHandles = data.inputs || [];
  const outputHandles = data.outputs || [];
  const Visual = definition.Visual;

  const setState = React.useCallback(
    (key: string, value: unknown) => {
      updateNodeState(String(id), { [key]: value });
    },
    [id, updateNodeState]
  );

  const getInput = React.useCallback(
    (inputId: string) => {
      const edge = graph.edges.find(
        (e) => e.target === id && e.targetHandle === inputId
      );

      if (!edge?.source) return null;

      return evaluateNode(String(edge.source), edge.sourceHandle ?? 'out', graph);
    },
    [graph, id]
  );

  return (
    <div className="min-w-[220px] rounded-lg border bg-background p-3 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-medium">{data.label}</div>
        <div className="text-xs text-muted-foreground">{definition.category}</div>
      </div>

      <div>
        <Visual
          nodeId={String(id)}
          state={data.state ?? {}}
          setState={setState}
          getInput={getInput}
        />
      </div>

      <div className="mt-3 flex w-full gap-4">
        <div className="flex w-full flex-col gap-2">
          {inputHandles.map((input) => (
            <div key={input.id} className="relative rounded-md bg-muted px-2 py-1 text-xs">
              <div>{input.name}</div>
              <Handle
                id={input.id}
                type="target"
                position={Position.Left}
                style={{
                  left: '0',
                  transform: 'translate(-50%, -50%)',
                  right: 'unset',
                  top: '50%',
                  border: 'none',
                  width: 10,
                  height: 10,
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2">
          {outputHandles.map((output) => (
            <div key={output.id} className="relative rounded-md bg-muted px-2 py-1 text-xs">
              <div>{output.name}</div>
              <Handle
                id={output.id}
                type="source"
                position={Position.Right}
                style={{
                  left: 'unset',
                  transform: 'translate(50%, -50%)',
                  right: '0',
                  top: '50%',
                  border: 'none',
                  width: 10,
                  height: 10,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  customNode: CustomNode,
};

function useFlowDocumentController(entity: EntityRecord | null): FlowDocumentController {
  const updateEntityMutation = useUpdateEntity();
  const { roomId, setIsConnected } = useRoom();
  const user = useAuthStore((s: any) => s.user);

  const [provider, setProvider] = React.useState<HocuspocusProvider | null>(null);
  const [ydoc, setYdoc] = React.useState<Y.Doc | null>(null);
  const [graph, setGraph] = React.useState<FlowGraph>({ nodes: [], edges: [] });
  const [status, setStatus] = React.useState<FlowDocumentStatus>('idle');
  const [persistStatus, setPersistStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [presences, setPresences] = React.useState<RemotePresence[]>([]);
  const lastSavedSnapshotRef = React.useRef<string>('');
  const saveTimerRef = React.useRef<number | null>(null);
  const centerResolverRef = React.useRef<(() => XYPosition) | null>(null);
  const sessionIdRef = React.useRef(createSessionId());

  const roomName = React.useMemo(() => {
    if (!roomId) return null;
    return `flow-room-${roomId}`;
  }, [roomId]);

  const currentUser = React.useMemo<PresenceUser | null>(() => {
    if (!user?.$id || !user.email) return null;
    return {
      userId: user.$id,
      sessionId: sessionIdRef.current,
      email: user.email,
      name: user.name?.trim() || user.email.split('@')[0] || 'User',
      color: createColorFromString(user.$id),
      joinedAt: Date.now(),
    };
  }, [user?.$id, user?.email, user?.name]);

  const saveSnapshotToDb = React.useCallback(
    async (snapshot: string, metadataPatch?: Record<string, unknown>) => {
      if (!entity?.$id) return;

      setPersistStatus('saving');

      const mergedMetadata = {
        ...(safeParseJson<Record<string, unknown>>(entity.metadata, {}) ?? {}),
        ...(metadataPatch ?? {}),
      };

      await updateEntityMutation.mutateAsync({
        entityId: entity.$id,
        data: {
          data: snapshot,
          metadata: JSON.stringify(mergedMetadata),
        },
      });

      lastSavedSnapshotRef.current = snapshot;
      setPersistStatus('saved');
    },
    [entity?.$id, entity?.metadata, updateEntityMutation]
  );

  const queuePersist = React.useCallback(
    (nextGraph: FlowGraph) => {
      const snapshot = serializeGraph(nextGraph);
      if (snapshot === lastSavedSnapshotRef.current) return;

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = window.setTimeout(async () => {
        try {
          await saveSnapshotToDb(snapshot, { sync: 'yjs' });
        } catch (error) {
          console.error(error);
          setPersistStatus('error');
          toast.error('Не удалось сохранить граф');
        }
      }, 1200);
    },
    [saveSnapshotToDb]
  );

  const saveNow = React.useCallback(async () => {
    const snapshot = serializeGraph(graph);
    try {
      await saveSnapshotToDb(snapshot, { sync: 'yjs' });
      toast.success('Сохранено');
    } catch (error) {
      console.error(error);
      setPersistStatus('error');
      toast.error('Ошибка сохранения');
    }
  }, [graph, saveSnapshotToDb]);

  React.useEffect(() => {
    if (!roomName) {
      setGraph({ nodes: [], edges: [] });
      setProvider(null);
      setYdoc(null);
      setStatus('idle');
      return;
    }

    setStatus('connecting');

    const doc = new Y.Doc();
    const { nodes: yNodes, edges: yEdges, meta } = ensureMaps(doc);

    bootstrapSeedIntoDoc(entity, yNodes, yEdges, meta);

    const nextProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL!,
      name: roomName,
      document: doc,
      onConnect: () => {
        setStatus('connected');
        setIsConnected(true);

        if (currentUser) {
          nextProvider.setAwarenessField('user', currentUser);
          nextProvider.setAwarenessField('selection', { nodeIds: [], edgeIds: [] });
        }
      },
      onSynced: ({ state }) => {
        setStatus(state ? 'synced' : 'connected');
      },
      onDisconnect: () => {
        setStatus('idle');
        setIsConnected(false);
      },
      onClose: () => {
        setStatus('idle');
        setIsConnected(false);
      },
    });

    const updateGraph = () => {
      const nextGraph = graphFromDoc(yNodes, yEdges);
      setGraph(nextGraph);
      queuePersist(nextGraph);
    };

    const updatePresence = ({
      states,
    }: {
      states: Map<number, Record<string, any>>;
    }) => {
      const next = Array.from(states.entries())
        .map(([clientId, state]) => {
          const rawUser = state?.user;
          if (!rawUser || typeof rawUser !== 'object') return null;
          if (rawUser.sessionId === sessionIdRef.current) return null;

          const userValue: PresenceUser = {
            userId: String(rawUser.userId ?? ''),
            sessionId: String(rawUser.sessionId ?? ''),
            email: String(rawUser.email ?? ''),
            name: String(rawUser.name ?? 'User'),
            color:
              typeof rawUser.color === 'string'
                ? rawUser.color
                : createColorFromString(String(rawUser.userId ?? rawUser.sessionId ?? clientId)),
            joinedAt:
              typeof rawUser.joinedAt === 'number' ? rawUser.joinedAt : Date.now(),
          };

          return {
            clientId,
            user: userValue,
            cursor:
              state?.cursor && typeof state.cursor === 'object'
                ? (state.cursor as PresenceCursor)
                : null,
            selection:
              state?.selection && typeof state.selection === 'object'
                ? (state.selection as RemotePresence['selection'])
                : null,
          } satisfies RemotePresence;
        })
        .filter((value): value is RemotePresence => !!value);

      setPresences(next);
    };

    yNodes.observe(updateGraph);
    yEdges.observe(updateGraph);
    nextProvider.on('awarenessUpdate', updatePresence);
    nextProvider.on('awarenessChange', updatePresence);

    updateGraph();
    setProvider(nextProvider);
    setYdoc(doc);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      nextProvider.off('awarenessUpdate', updatePresence);
      nextProvider.off('awarenessChange', updatePresence);
      yNodes.unobserve(updateGraph);
      yEdges.unobserve(updateGraph);
      nextProvider.destroy();
      doc.destroy();
      setProvider(null);
      setYdoc(null);
      setPresences([]);
      setIsConnected(false);
    };
  }, [roomName, entity, currentUser, queuePersist, setIsConnected]);

  const mutateGraph = React.useCallback(
    (updater: (current: FlowGraph) => FlowGraph) => {
      if (!ydoc) return;
      const { nodes: yNodes, edges: yEdges } = ensureMaps(ydoc);
      const current = graphFromDoc(yNodes, yEdges);
      const next = updater(current);

      ydoc.transact(() => {
        syncNodesToYjs(yNodes, next.nodes);
        syncEdgesToYjs(yEdges, next.edges);
      });
    },
    [ydoc]
  );

  const onNodesChange = React.useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      mutateGraph((current) => ({
        nodes: applyNodeChanges(changes, current.nodes),
        edges: current.edges,
      }));
    },
    [mutateGraph]
  );

  const onEdgesChange = React.useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      mutateGraph((current) => ({
        nodes: current.nodes,
        edges: applyEdgeChanges(changes, current.edges),
      }));
    },
    [mutateGraph]
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      mutateGraph((current) => ({
        nodes: current.nodes,
        edges: addEdge(
          {
            ...connection,
            id: crypto.randomUUID(),
            type: 'default',
          },
          current.edges
        ) as FlowEdge[],
      }));
    },
    [mutateGraph]
  );

  const updateNodeState = React.useCallback(
    (nodeId: string, patch: Record<string, unknown>) => {
      mutateGraph((current) => ({
        nodes: current.nodes.map((node) => {
          if (String(node.id) !== nodeId) return node;
          return {
            ...node,
            data: {
              ...node.data,
              state: {
                ...(node.data.state ?? {}),
                ...patch,
              },
            },
          };
        }),
        edges: current.edges,
      }));
    },
    [mutateGraph]
  );

  const addNode = React.useCallback(
    (definitionId: string, position?: XYPosition) => {
      mutateGraph((current) => ({
        nodes: [
          ...current.nodes,
          createNodeInstance(definitionId, position ?? { x: 300, y: 200 }),
        ],
        edges: current.edges,
      }));
    },
    [mutateGraph]
  );

  const addNodeAtCenter = React.useCallback(
    (definitionId: string) => {
      const center = centerResolverRef.current?.() ?? { x: 300, y: 200 };
      addNode(definitionId, center);
      toast.success('Блок добавлен');
    },
    [addNode]
  );

  const duplicateSelection = React.useCallback(() => {
    mutateGraph((current) => {
      const selectedNodes = current.nodes.filter((node) => node.selected);
      if (!selectedNodes.length) return current;

      const idMap = new Map<string, string>();

      const duplicatedNodes = selectedNodes.map((node) => {
        const duplicate = createNodeInstance(node.data._definition.id, {
          x: node.position.x + 40,
          y: node.position.y + 40,
        });

        duplicate.data = {
          ...toPlain(node.data),
          state: toPlain(node.data.state ?? {}),
        };

        idMap.set(String(node.id), String(duplicate.id));
        return duplicate;
      });

      const duplicatedEdges = current.edges
        .filter(
          (edge) =>
            idMap.has(String(edge.source)) && idMap.has(String(edge.target))
        )
        .map((edge) => ({
          ...edge,
          id: crypto.randomUUID(),
          source: idMap.get(String(edge.source))!,
          target: idMap.get(String(edge.target))!,
          selected: false,
        }));

      return {
        nodes: [
          ...current.nodes.map((node) => ({ ...node, selected: false })),
          ...duplicatedNodes.map((node) => ({ ...node, selected: true })),
        ],
        edges: [...current.edges, ...duplicatedEdges],
      };
    });
  }, [mutateGraph]);

  const deleteSelection = React.useCallback(() => {
    mutateGraph((current) => {
      const selectedNodeIds = new Set(
        current.nodes.filter((node) => node.selected).map((node) => String(node.id))
      );
      const selectedEdgeIds = new Set(
        current.edges.filter((edge) => edge.selected).map((edge) => String(edge.id))
      );

      return {
        nodes: current.nodes.filter((node) => !selectedNodeIds.has(String(node.id))),
        edges: current.edges.filter(
          (edge) =>
            !selectedEdgeIds.has(String(edge.id)) &&
            !selectedNodeIds.has(String(edge.source)) &&
            !selectedNodeIds.has(String(edge.target))
        ),
      };
    });
  }, [mutateGraph]);

  const setCenterResolver = React.useCallback((resolver: (() => XYPosition) | null) => {
    centerResolverRef.current = resolver;
  }, []);

  return {
    provider,
    ydoc,
    graph,
    nodes: graph.nodes,
    edges: graph.edges,
    presences,
    status,
    persistStatus,
    roomName,
    onNodesChange,
    onEdgesChange,
    onConnect,
    updateNodeState,
    addNode,
    addNodeAtCenter,
    duplicateSelection,
    deleteSelection,
    saveNow,
    setCenterResolver,
  };
}

function FlowDocumentProvider({
  entity,
  children,
}: {
  entity: EntityRecord | null;
  children: React.ReactNode;
}) {
  const controller = useFlowDocumentController(entity);
  return (
    <FlowDocumentContext.Provider value={controller}>
      {children}
    </FlowDocumentContext.Provider>
  );
}

function CursorAwarenessSync() {
  const { provider, status } = useFlowDocument();
  const reactFlow = useReactFlow();

  React.useEffect(() => {
    if (!provider || (status !== 'connected' && status !== 'synced')) return;

    const root = document.querySelector('.react-flow') as HTMLElement | null;
    if (!root) return;

    let frame = 0;

    const publish = (event: MouseEvent) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const flowPoint = reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        provider.setAwarenessField('cursor', {
          x: flowPoint.x,
          y: flowPoint.y,
          viewport: reactFlow.getViewport(),
          updatedAt: Date.now(),
        });
      });
    };

    const clear = () => {
      provider.setAwarenessField('cursor', null);
    };

    root.addEventListener('mousemove', publish);
    root.addEventListener('mouseleave', clear);
    root.addEventListener('dragend', clear);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener('mousemove', publish);
      root.removeEventListener('mouseleave', clear);
      root.removeEventListener('dragend', clear);
    };
  }, [provider, reactFlow, status]);

  return null;
}

function SelectionAwarenessSync() {
  const { provider, graph } = useFlowDocument();

  React.useEffect(() => {
    if (!provider) return;

    const selectedNodeIds = graph.nodes.filter((n) => n.selected).map((n) => String(n.id));
    const selectedEdgeIds = graph.edges.filter((e) => e.selected).map((e) => String(e.id));

    provider.setAwarenessField('selection', {
      nodeIds: selectedNodeIds,
      edgeIds: selectedEdgeIds,
    });
  }, [provider, graph]);

  return null;
}

function RemoteCursorLayer() {
  const { presences } = useFlowDocument();
  const reactFlow = useReactFlow();

  const visible = React.useMemo(
    () => presences.filter((presence) => presence.cursor),
    [presences]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[20] overflow-hidden">
      {visible.map((presence) => {
        const cursor = presence.cursor!;
        const point = reactFlow.flowToScreenPosition({ x: cursor.x, y: cursor.y });

        return (
          <div
            key={`${presence.user.userId}:${presence.user.sessionId}`}
            className="absolute"
            style={{
              left: point.x,
              top: point.y,
              transform: 'translate(8px, 8px)',
            }}
          >
            <div className="relative">
              <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm">
                <path
                  d="M3 2L14 9L9.5 10.2L11.5 15.2L9.2 16L7.3 11.1L3 14V2Z"
                  fill={presence.user.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              <div
                className="mt-1 inline-flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium text-white shadow"
                style={{ backgroundColor: presence.user.color }}
              >
                <span className="h-2 w-2 rounded-full bg-white/80" />
                {presence.user.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CenterResolverBridge() {
  const reactFlow = useReactFlow();
  const { setCenterResolver } = useFlowDocument();

  React.useEffect(() => {
    setCenterResolver(() => {
      const pane = document.querySelector('.react-flow__pane')?.getBoundingClientRect();
      if (!pane) {
        const viewport = reactFlow.getViewport();
        return { x: -viewport.x + 200, y: -viewport.y + 120 };
      }

      return reactFlow.screenToFlowPosition({
        x: pane.left + pane.width / 2,
        y: pane.top + pane.height / 2,
      });
    });

    return () => {
      setCenterResolver(null);
    };
  }, [reactFlow, setCenterResolver]);

  return null;
}

function LobbyList() {
  const { visitors, connected, isOwner, sendInvite } = useLobby();

  if (!isOwner) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <User />
          Лобби
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Лобби</span>
          <span className="text-xs font-normal text-muted-foreground">
            {connected ? 'online' : 'reconnecting...'}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {visitors.length === 0 ? (
          <DropdownMenuItem disabled>
            Nobody is viewing this workspace
          </DropdownMenuItem>
        ) : (
          <DropdownMenuGroup>
            {visitors.map((visitor) => {
              const isSending = visitor.inviteStatus === 'sending';
              const isSent = visitor.inviteStatus === 'sent';

              return (
                <DropdownMenuItem
                  key={`${visitor.userId}:${visitor.sessionId}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!isSending) {
                      void sendInvite(visitor);
                    }
                  }}
                  disabled={isSending}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {visitor.name || visitor.email}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {visitor.email}
                    </div>
                  </div>

                  <div className="shrink-0 text-muted-foreground">
                    {isSending ? (
                      <RotateCcw className="size-4 animate-spin" />
                    ) : isSent ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AvatarGroupExample() {
  const { self, visitors } = useLobby();

  const people = React.useMemo(() => {
    const result: { userId: string; sessionId: string; name: string }[] = [];
    if (self) result.push(self);
    result.push(...visitors.slice(0, 5));
    return result;
  }, [self, visitors]);

  return (
    <AvatarGroup className="grayscale">
      {people.map((person) => (
        <Avatar key={`${person.userId}:${person.sessionId}`}>
          <AvatarFallback>
            {person.name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

function FileList() {
  const workspaceId = useWorkspaceId();
  const { roomId, setRoomId, setIsConnected } = useRoom();

  const { data, isLoading } = useEntities({
    workspaceId: workspaceId ?? '',
    limit: 100,
  });

  const entities = data?.entities ?? data ?? [];
  const createEntityMutation = useCreateEntity();

  const selectedEntity =
    entities.find((entity: EntityRecord) => entity.$id === roomId) ?? null;

  const handleSelect = React.useCallback(
    (entityId: string) => {
      if (entityId === roomId) return;
      setIsConnected(false);
      setRoomId(entityId);
    },
    [roomId, setIsConnected, setRoomId]
  );

  const handleCreate = React.useCallback(async () => {
    if (!workspaceId || createEntityMutation.isPending) return;

    const createdEntity = await createEntityMutation.mutateAsync({
      name: `Untitled ${entities.length + 1}`,
      editor: 'flow',
      data: JSON.stringify({ nodes: [], edges: [] }),
      workspaceId,
      description: '',
      folders: [],
      metadata: stringifyJson({ sync: 'db' }),
      public: false,
      featured: false,
      store: false,
      price: 0,
    });

    setIsConnected(false);
    setRoomId(createdEntity.$id);
    toast.success('Файл создан');
  }, [
    workspaceId,
    createEntityMutation,
    entities.length,
    setIsConnected,
    setRoomId,
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" type="button">
          <File className="size-4" />
          {selectedEntity?.name ?? 'Файлы'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel>Файлы</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleCreate}
            disabled={!workspaceId || createEntityMutation.isPending}
          >
            <File className="mr-2 size-4" />
            {createEntityMutation.isPending ? 'Создание...' : 'Создать файл'}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {isLoading ? (
            <DropdownMenuItem disabled>Загрузка...</DropdownMenuItem>
          ) : entities.length === 0 ? (
            <DropdownMenuItem disabled>Нет файлов</DropdownMenuItem>
          ) : (
            entities.map((entity: EntityRecord) => {
              const active = entity.$id === roomId;
              const sync = normalizeMetadata(entity.metadata).sync ?? 'db';

              return (
                <DropdownMenuItem
                  key={entity.$id}
                  onClick={() => handleSelect(entity.$id)}
                >
                  <span className="truncate">{entity.name}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {sync}
                    </span>
                    {active ? (
                      <span className="text-xs text-muted-foreground">Active</span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NodeMenu() {
  const { addNodeAtCenter } = useFlowDocument();
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NODE_REGISTRY;

    return NODE_REGISTRY.filter((node) => {
      return (
        node.name.toLowerCase().includes(q) ||
        node.category.toLowerCase().includes(q) ||
        (node.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Plug />
          Добавить блок
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="center" className="w-[520px] p-3">
        <DropdownMenuGroup className="flex h-full flex-col gap-2">
          <InputGroup>
            <InputGroupInput
              placeholder="Поиск блоков"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <ScrollArea className="h-[180px] lg:h-56">
            <div className="grid grid-cols-2 gap-4 pb-4">
              {filtered.map((node) => (
                <button
                  key={node.id}
                  className="flex items-center gap-4 rounded-md p-2 text-left hover:bg-muted"
                  onClick={() => addNodeAtCenter(node.id)}
                >
                  <div className="flex h-12 w-12 min-w-12 items-center justify-center rounded-md bg-muted">
                    <LineChart className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {node.description ?? node.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TopLeft() {
  return (
    <div>
      <Button variant="outline">
        <Star />
      </Button>
    </div>
  );
}

function SocialButtons() {
  const { saveNow, persistStatus } = useFlowDocument();

  return (
    <div className="flex gap-1">
      <Button variant="outline" onClick={() => void saveNow()}>
        {persistStatus === 'saving' ? <Loader2 className="animate-spin" /> : <Save />}
      </Button>
      <Button variant="outline"><Star /></Button>
      <Button variant="outline"><Star /></Button>
      <Button variant="outline"><Star /></Button>
    </div>
  );
}

function ControlButtons() {
  const { status } = useFlowDocument();

  return (
    <div className="flex gap-1">
      <Button variant="outline" title={status}>
        {status === 'connected' || status === 'synced' ? <Wifi /> : <WifiOff />}
      </Button>
      <Button variant="outline"><Star /></Button>
    </div>
  );
}

function SelectionActions() {
  const { graph, deleteSelection, duplicateSelection } = useFlowDocument();

  const hasSelection =
    graph.nodes.some((node) => node.selected) ||
    graph.edges.some((edge) => edge.selected);

  return (
    <ButtonGroup>
      <Button variant="outline" onClick={deleteSelection} disabled={!hasSelection}>
        <Trash />
      </Button>
      <Button variant="outline" onClick={duplicateSelection} disabled={!hasSelection}>
        <Copy />
      </Button>
    </ButtonGroup>
  );
}

function FlowInner() {
  const { presences, roomName, persistStatus } = useFlowDocument();

  return (
    <div>
      <Panel position="top-center">
        <SelectionActions />
      </Panel>

      <Panel position="top-right">
        <div className="flex items-center gap-2">
          <LobbyList />
          <AvatarGroupExample />
        </div>
      </Panel>

      <Panel position="bottom-left">
        <SocialButtons />
      </Panel>

      <Panel position="bottom-center">
        <NodeMenu />
      </Panel>

      <Panel position="bottom-right">
        <ControlButtons />
      </Panel>

      <Panel position="top-right">
        <div className="mt-14 rounded-md border bg-background/95 px-3 py-2 text-xs shadow">
          <div className="font-medium">Session</div>
          <div className="text-muted-foreground">room: {roomName ?? 'none'}</div>
          <div className="text-muted-foreground">remote users: {presences.length}</div>
          <div className="text-muted-foreground">persist: {persistStatus}</div>
        </div>
      </Panel>
    </div>
  );
}

function EditorCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowDocument();

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
      selectionOnDrag
      panOnDrag
      multiSelectionKeyCode={['Meta', 'Ctrl']}
      deleteKeyCode={['Delete', 'Backspace']}
    >
      <Background />
      <MiniMap pannable zoomable />
      <Controls style={{ bottom: '50px' }} />
      <CenterResolverBridge />
      <CursorAwarenessSync />
      <SelectionAwarenessSync />
      <RemoteCursorLayer />
      <FlowInner />
    </ReactFlow>
  );
}

function EmptyEditorState() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 text-center shadow-sm">
        <div className="mb-3 text-lg font-semibold">Выберите файл</div>
        <p className="text-sm text-muted-foreground">
          Открой существующий файл слева сверху или создай новый.
        </p>
      </div>
    </div>
  );
}

function EditorTopBar() {
  const { roomId } = useRoom();

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-50 flex gap-2">
      <TopLeft />
      <FileList />
      {roomId ? (
        <div className="rounded-md border bg-background/90 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          Active room: {roomId}
        </div>
      ) : null}
    </div>
  );
}

function EditorViewport() {
  const { roomId } = useRoom();
  const { data: entity, isLoading } = useEntity(roomId);

  return (
    <div className="relative h-screen w-full">
      <EditorTopBar />

      {!roomId ? (
        <EmptyEditorState />
      ) : isLoading ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Загрузка редактора...
        </div>
      ) : (
        <FlowDocumentProvider entity={entity ?? null}>
          <ReactFlowProvider>
            <EditorCanvas />
          </ReactFlowProvider>
        </FlowDocumentProvider>
      )}
    </div>
  );
}

function RoomBootstrap() {
  const { roomId, setRoomId } = useRoom();

  React.useEffect(() => {
    if (roomId) return;

    const url = new URL(window.location.href);
    const fileId = url.searchParams.get('fileId');

    if (fileId) {
      setRoomId(fileId);
    }
  }, [roomId, setRoomId]);

  return null;
}

function EditorApp() {
  return (
    <RoomProvider>
      <LobbyProvider>
        <LobbyGuard>
          <RoomBootstrap />
          <EditorViewport />
        </LobbyGuard>
      </LobbyProvider>
    </RoomProvider>
  );
}

export default function TestEditor() {
  return <div className='h-screen'>
    <EditorApp />
    </div>;
}
