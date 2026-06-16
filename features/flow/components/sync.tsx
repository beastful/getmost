'use client';

import * as React from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

import { useRoom } from '@/features/flow/contexts/room-context';
import {
  useFlowStore,
  type FlowNode,
  type FlowEdge,
} from '@/features/flow/store/flow-store';

type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

type SyncedNode = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Json;
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
  data?: Json;
};

const ORIGIN_STORE = Symbol('store');

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toSyncedNode(node: FlowNode): SyncedNode {
  return {
    id: String(node.id),
    type: node.type,
    position: {
      x: Number(node.position?.x ?? 0),
      y: Number(node.position?.y ?? 0),
    },
    data: toPlain(node.data ?? null) as Json,
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
    data: (node.data ?? {}) as FlowNode['data'],
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
    data: edge.data != null ? (toPlain(edge.data) as Json) : undefined,
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

  return {
    nodes: nodes as Y.Map<SyncedNode>,
    edges: edges as Y.Map<SyncedEdge>,
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

export function Sync() {
  const { roomId, setIsConnected } = useRoom();

  const [debug, setDebug] = React.useState({
    status: 'idle',
    connected: false,
    synced: false,
    yNodes: 0,
    yEdges: 0,
    localNodes: 0,
    localEdges: 0,
    last: 'init',
    error: '',
  });

  React.useEffect(() => {
    if (!roomId) return;

    const doc = new Y.Doc();
    const { nodes: yNodes, edges: yEdges } = ensureMaps(doc);

    let applyingRemote = false;

    const provider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_HOCUSPOCUS_URL!,
      name: roomId,
      document: doc,
      onConnect: () => {
        setIsConnected(true);
        setDebug((d) => ({ ...d, connected: true, last: 'connect' }));
      },
      onDisconnect: () => {
        setIsConnected(false);
        useFlowStore.getState().setIsSynced(false);
        setDebug((d) => ({
          ...d,
          connected: false,
          synced: false,
          last: 'disconnect',
        }));
      },
      onSynced: ({ state }) => {
        useFlowStore.getState().setIsSynced(!!state);
        setDebug((d) => ({
          ...d,
          synced: !!state,
          last: `synced:${String(state)}`,
        }));
      },
    });

    provider.on('status', ({ status }) => {
      setDebug((d) => ({ ...d, status, last: `status:${status}` }));
    });

    const updateDebug = (last?: string, error = '') => {
      const store = useFlowStore.getState();
      setDebug((d) => ({
        ...d,
        yNodes: yNodes.size,
        yEdges: yEdges.size,
        localNodes: store.nodes.length,
        localEdges: store.edges.length,
        last: last ?? d.last,
        error,
      }));
    };

    const applyRemoteToStore = () => {
      try {
        const nextNodes = readNodes(yNodes);
        const nextEdges = readEdges(yEdges);

        applyingRemote = true;
        useFlowStore.getState().replaceGraph(nextNodes, nextEdges);

        queueMicrotask(() => {
          applyingRemote = false;
        });

        updateDebug('yjs->store');
      } catch (error) {
        updateDebug(
          'yjs->store:error',
          error instanceof Error ? error.message : String(error)
        );
      }
    };

    const handleYjsChange = () => {
      applyRemoteToStore();
    };

    yNodes.observe(handleYjsChange);
    yEdges.observe(handleYjsChange);

    const unsub = useFlowStore.subscribe(
      (state) => ({ nodes: state.nodes, edges: state.edges }),
      (next) => {
        if (applyingRemote) return;

        try {
          doc.transact(() => {
            syncNodesToYjs(yNodes, next.nodes);
            syncEdgesToYjs(yEdges, next.edges);
          }, ORIGIN_STORE);

          updateDebug('store->yjs');
        } catch (error) {
          updateDebug(
            'store->yjs:error',
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    );

    updateDebug('mounted');
    applyRemoteToStore();

    return () => {
      unsub();
      yNodes.unobserve(handleYjsChange);
      yEdges.unobserve(handleYjsChange);
      provider.destroy();
      doc.destroy();
      setIsConnected(false);
      useFlowStore.getState().setIsSynced(false);
    };
  }, [roomId, setIsConnected]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        bottom: 12,
        zIndex: 9999,
        width: 300,
        padding: 12,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.82)',
        color: '#fff',
        fontSize: 12,
        fontFamily: 'monospace',
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Sync Debug</div>
      <div>room: {roomId ?? 'none'}</div>
      <div>status: {debug.status}</div>
      <div>connected: {String(debug.connected)}</div>
      <div>synced: {String(debug.synced)}</div>
      <div>local nodes: {debug.localNodes}</div>
      <div>local edges: {debug.localEdges}</div>
      <div>yjs nodes: {debug.yNodes}</div>
      <div>yjs edges: {debug.yEdges}</div>
      <div>last: {debug.last}</div>
      {debug.error ? (
        <div style={{ marginTop: 8, color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
          error: {debug.error}
        </div>
      ) : null}
    </div>
  );
}