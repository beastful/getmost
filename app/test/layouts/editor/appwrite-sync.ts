'use client';

import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';

import { useFlowStore } from './store';
import { readEntity } from '@/features/project/api/read-entity';
import { updateEntity } from '@/features/project/api/update-entity';

const HOCUSPOCUS_URL = 'wss://ez5c0rv0qswls1v5jm2yzvdc.getmost.app';

export type FlowSnapshot = {
  nodes: Node[];
  edges: Edge[];
};

type SessionStatus = 'idle' | 'loading' | 'connecting' | 'connected' | 'synced' | 'saving' | 'error';

type EditorAwarenessUser = {
  userId: string;
  sessionId: string;
  email: string;
  name: string;
  entityId: string;
  joinedAt: number;
};

type EntitySession = {
  entityId: string;
  roomName: string;
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  yNodes: Y.Map<Node>;
  yEdges: Y.Map<Edge>;
  status: SessionStatus;
  saveTimer: ReturnType<typeof setTimeout> | null;
  lastSavedAt: number | null;
  destroy: () => void;
};

let currentSession: EntitySession | null = null;
let restoreActions: null | (() => void) = null;
let isApplyingRemoteUpdate = false;
let awarenessIdentity: Omit<EditorAwarenessUser, 'entityId' | 'joinedAt'> | null = null;

export function setCollaborationIdentity(identity: Omit<EditorAwarenessUser, 'entityId' | 'joinedAt'>) {
  awarenessIdentity = identity;
}

function getRoomName(entityId: string) {
  return `entity:${entityId}`;
}

function cleanNodeForSync(node: Node): Node {
  const { selected, dragging, measured, resizing, ...rest } = node as any;
  return { ...rest, data: { ...(rest.data ?? {}) } };
}

function cleanEdgeForSync(edge: Edge): Edge {
  const { selected, ...rest } = edge as any;
  return rest;
}

function serializeSnapshot(snapshot: FlowSnapshot) {
  return JSON.stringify(snapshot);
}

function parseSnapshot(raw?: string | null): FlowSnapshot {
  if (!raw) return { nodes: [], edges: [] };

  try {
    const parsed = JSON.parse(raw);
    return {
      nodes: Array.isArray(parsed?.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed?.edges) ? parsed.edges : [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function getStoreSnapshot(): FlowSnapshot {
  const { nodes, edges } = useFlowStore.getState();
  return {
    nodes: nodes.map(cleanNodeForSync),
    edges: edges.map(cleanEdgeForSync),
  };
}

function setStoreSnapshot(snapshot: FlowSnapshot) {
  isApplyingRemoteUpdate = true;
  try {
    useFlowStore.getState().setNodes(snapshot.nodes);
    useFlowStore.getState().setEdges(snapshot.edges);
  } finally {
    isApplyingRemoteUpdate = false;
  }
}

function pushNodesToYjs(nodes: Node[]) {
  if (!currentSession) return;

  currentSession.ydoc.transact(() => {
    const ids = new Set(nodes.map((n) => n.id));

    currentSession!.yNodes.forEach((_, key) => {
      if (!ids.has(key)) currentSession!.yNodes.delete(key);
    });

    nodes.forEach((node) => {
      currentSession!.yNodes.set(node.id, cleanNodeForSync(node));
    });
  });
}

function pushEdgesToYjs(edges: Edge[]) {
  if (!currentSession) return;

  currentSession.ydoc.transact(() => {
    const ids = new Set(edges.map((e) => e.id));

    currentSession!.yEdges.forEach((_, key) => {
      if (!ids.has(key)) currentSession!.yEdges.delete(key);
    });

    edges.forEach((edge) => {
      currentSession!.yEdges.set(edge.id, cleanEdgeForSync(edge));
    });
  });
}

function applyFromYjs() {
  if (!currentSession) return;

  const nodes = Array.from(currentSession.yNodes.values());
  const edges = Array.from(currentSession.yEdges.values());

  setStoreSnapshot({ nodes, edges });
}

async function persistNow() {
  if (!currentSession) return null;

  currentSession.status = 'saving';

  const snapshot = getStoreSnapshot();
  const updated = await updateEntity(currentSession.entityId, {
    data: serializeSnapshot(snapshot),
  });

  currentSession.lastSavedAt = Date.now();
  currentSession.status = 'synced';

  return updated;
}

function scheduleSave(delay = 1200) {
  if (!currentSession) return;

  if (currentSession.saveTimer) clearTimeout(currentSession.saveTimer);

  currentSession.saveTimer = setTimeout(async () => {
    try {
      await persistNow();
    } catch (error) {
      console.error('[collab] save failed', error);
      if (currentSession) currentSession.status = 'error';
    }
  }, delay);
}

function patchStore() {
  if (restoreActions) return;

  const state = useFlowStore.getState();

  const originalSetNodes = state.setNodes;
  const originalSetEdges = state.setEdges;
  const originalAddNode = state.addNode;
  const originalAddEdge = state.addEdge;
  const originalUpdateNodeData = state.updateNodeData;
  const originalOnNodesChange = state.onNodesChange;
  const originalOnEdgesChange = state.onEdgesChange;

  useFlowStore.setState({
    setNodes: (nodes) => {
      originalSetNodes(nodes);
      if (!currentSession || isApplyingRemoteUpdate) return;
      pushNodesToYjs(useFlowStore.getState().nodes);
      scheduleSave();
    },

    setEdges: (edges) => {
      originalSetEdges(edges);
      if (!currentSession || isApplyingRemoteUpdate) return;
      pushEdgesToYjs(useFlowStore.getState().edges);
      scheduleSave();
    },

    addNode: (node) => {
      originalAddNode(node);
      if (!currentSession || isApplyingRemoteUpdate) return;
      currentSession.yNodes.set(node.id, cleanNodeForSync(node));
      scheduleSave();
    },

    addEdge: (edge) => {
      originalAddEdge(edge);
      if (!currentSession || isApplyingRemoteUpdate) return;
      pushEdgesToYjs(useFlowStore.getState().edges);
      scheduleSave();
    },

    updateNodeData: (nodeId, patch) => {
      originalUpdateNodeData(nodeId, patch);
      if (!currentSession || isApplyingRemoteUpdate) return;

      const node = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
      if (!node) return;

      currentSession.yNodes.set(node.id, cleanNodeForSync(node));
      scheduleSave();
    },

    onNodesChange: (changes: NodeChange[]) => {
      originalOnNodesChange(changes);
      if (!currentSession || isApplyingRemoteUpdate) return;

      const shouldSync = changes.some((c) =>
        c.type === 'position' || c.type === 'remove' || c.type === 'add' || c.type === 'replace'
      );

      if (!shouldSync) return;

      pushNodesToYjs(useFlowStore.getState().nodes);
      scheduleSave();
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      originalOnEdgesChange(changes);
      if (!currentSession || isApplyingRemoteUpdate || changes.length === 0) return;
      pushEdgesToYjs(useFlowStore.getState().edges);
      scheduleSave();
    },
  });

  restoreActions = () => {
    useFlowStore.setState({
      setNodes: originalSetNodes,
      setEdges: originalSetEdges,
      addNode: originalAddNode,
      addEdge: originalAddEdge,
      updateNodeData: originalUpdateNodeData,
      onNodesChange: originalOnNodesChange,
      onEdgesChange: originalOnEdgesChange,
    });
    restoreActions = null;
  };
}

function unpatchStore() {
  restoreActions?.();
  restoreActions = null;
}

function setEditorAwareness(entityId: string) {
  if (!currentSession || !awarenessIdentity) return;

  currentSession.provider.setAwarenessField('editor', {
    ...awarenessIdentity,
    entityId,
    joinedAt: Date.now(),
  });
}

function createSession(entityId: string) {
  const ydoc = new Y.Doc();
  const yNodes = ydoc.getMap<Node>('nodes');
  const yEdges = ydoc.getMap<Edge>('edges');

  const provider = new HocuspocusProvider({
    url: HOCUSPOCUS_URL,
    name: getRoomName(entityId),
    document: ydoc,
    onConnect: () => {
      if (currentSession?.entityId === entityId) {
        currentSession.status = 'connected';
        setEditorAwareness(entityId);
      }
    },
    onSynced: () => {
      if (currentSession?.entityId === entityId) {
        currentSession.status = 'synced';
      }
    },
    onDisconnect: () => {
      if (currentSession?.entityId === entityId) {
        currentSession.status = 'connecting';
      }
    },
    onError: ({ error }) => {
      console.error('[collab] provider error', error);
      if (currentSession?.entityId === entityId) {
        currentSession.status = 'error';
      }
    },
  });

  const apply = () => {
    if (!currentSession || currentSession.entityId !== entityId) return;
    applyFromYjs();
  };

  yNodes.observe(apply);
  yEdges.observe(apply);

  const session: EntitySession = {
    entityId,
    roomName: getRoomName(entityId),
    ydoc,
    provider,
    yNodes,
    yEdges,
    status: 'connecting',
    saveTimer: null,
    lastSavedAt: null,
    destroy: () => {
      yNodes.unobserve(apply);
      yEdges.unobserve(apply);
      if (session.saveTimer) clearTimeout(session.saveTimer);
      provider.destroy();
      ydoc.destroy();
    },
  };

  return session;
}

export async function openEntityRoom(entityId: string) {
  if (currentSession?.entityId === entityId) return currentSession;

  await closeEntityRoom({ save: true });
  patchStore();

  const entity = await readEntity(entityId);
  const snapshot = parseSnapshot(entity.data);
  setStoreSnapshot(snapshot);

  const session = createSession(entityId);
  currentSession = session;

  if (session.yNodes.size === 0 && session.yEdges.size === 0) {
    const local = getStoreSnapshot();
    session.ydoc.transact(() => {
      local.nodes.forEach((n) => session.yNodes.set(n.id, n));
      local.edges.forEach((e) => session.yEdges.set(e.id, e));
    });
  }

  return session;
}

export async function closeEntityRoom(options?: { save?: boolean }) {
  const session = currentSession;
  if (!session) {
    unpatchStore();
    return;
  }

  if (options?.save) {
    try {
      await persistNow();
    } catch (error) {
      console.error('[collab] final save failed', error);
    }
  }

  session.destroy();
  currentSession = null;
  unpatchStore();
}

export async function saveEntityRoomNow() {
  return persistNow();
}

export function getCurrentEntityRoom() {
  return currentSession;
}

export function getCurrentEntityRoomState() {
  return {
    entityId: currentSession?.entityId ?? null,
    roomName: currentSession?.roomName ?? null,
    status: currentSession?.status ?? 'idle',
    lastSavedAt: currentSession?.lastSavedAt ?? null,
  };
}

export function getCurrentEditors() {
  if (!currentSession) return [];

  const states = currentSession.provider.awareness.getStates() as Map<number, Record<string, any>>;
  const editors = Array.from(states.values())
    .map((value) => value?.editor)
    .filter(Boolean);

  const unique = new Map<string, EditorAwarenessUser>();

  editors.forEach((editor: EditorAwarenessUser) => {
    unique.set(`${editor.userId}:${editor.sessionId}`, editor);
  });

  return Array.from(unique.values()).sort((a, b) => a.joinedAt - b.joinedAt);
}
