'use client';

import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Edge, EdgeChange, Node, NodeChange } from '@xyflow/react';
import { useFlowStore } from './store';

const HOCUSPOCUS_URL = 'wss://ez5c0rv0qswls1v5jm2yzvdc.getmost.app';
const DOCUMENT_NAME = 'flow-test';

type FlowSession = {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  yNodes: Y.Map<Node>;
  yEdges: Y.Map<Edge>;
  destroy: () => void;
};

let session: FlowSession | null = null;
let isApplyingRemoteUpdate = false;
let restoreActions: null | (() => void) = null;

function cleanNodeForSync(node: Node): Node {
  const { selected, dragging, measured, resizing, ...rest } = node as any;

  return {
    ...rest,
    data: {
      ...(rest.data ?? {}),
    },
  };
}

function cleanEdgeForSync(edge: Edge): Edge {
  const { selected, ...rest } = edge as any;
  return rest;
}

function mapValuesToArray<T>(map: Y.Map<T>): T[] {
  return Array.from(map.values());
}

function pushAllNodesToYjs(nodes: Node[]) {
  if (!session) return;

  session.ydoc.transact(() => {
    const currentIds = new Set(nodes.map((n) => n.id));

    session!.yNodes.forEach((_, key) => {
      if (!currentIds.has(key)) session!.yNodes.delete(key);
    });

    nodes.forEach((node) => {
      session!.yNodes.set(node.id, cleanNodeForSync(node));
    });
  });
}

function pushAllEdgesToYjs(edges: Edge[]) {
  if (!session) return;

  session.ydoc.transact(() => {
    const currentIds = new Set(edges.map((e) => e.id));

    session!.yEdges.forEach((_, key) => {
      if (!currentIds.has(key)) session!.yEdges.delete(key);
    });

    edges.forEach((edge) => {
      session!.yEdges.set(edge.id, cleanEdgeForSync(edge));
    });
  });
}

function applyFromYjs() {
  if (!session) return;

  isApplyingRemoteUpdate = true;
  try {
    useFlowStore.getState().setNodes(mapValuesToArray(session.yNodes));
    useFlowStore.getState().setEdges(mapValuesToArray(session.yEdges));
  } finally {
    isApplyingRemoteUpdate = false;
  }
}

function createSession() {
  if (session) return session;

  const ydoc = new Y.Doc();
  const yNodes = ydoc.getMap<Node>('nodes');
  const yEdges = ydoc.getMap<Edge>('edges');

  const provider = new HocuspocusProvider({
    url: HOCUSPOCUS_URL,
    name: DOCUMENT_NAME,
    document: ydoc,
    onStatus({ status }) {
      console.log('[hocuspocus] status:', status);
    },
    onSynced() {
      console.log('[hocuspocus] synced');

      const { nodes, edges } = useFlowStore.getState();

      if (yNodes.size === 0 && yEdges.size === 0) {
        ydoc.transact(() => {
          nodes.forEach((node) => yNodes.set(node.id, cleanNodeForSync(node)));
          edges.forEach((edge) => yEdges.set(edge.id, cleanEdgeForSync(edge)));
        });
      } else {
        applyFromYjs();
      }
    },
    onError({ error }) {
      console.error('[hocuspocus] error:', error);
    },
  });

  yNodes.observe(applyFromYjs);
  yEdges.observe(applyFromYjs);

  session = {
    ydoc,
    provider,
    yNodes,
    yEdges,
    destroy: () => {
      yNodes.unobserve(applyFromYjs);
      yEdges.unobserve(applyFromYjs);
      provider.destroy();
      ydoc.destroy();
      session = null;
    },
  };

  return session;
}

export function enableTestCollaboration() {
  if (restoreActions) return session;

  const s = createSession();
  const state = useFlowStore.getState();

  const originalSetNodes = state.setNodes;
  const originalSetEdges = state.setEdges;
  const originalAddNode = state.addNode;
  const originalAddEdge = state.addEdge;
  const originalUpdateNodeData = state.updateNodeData;
  const originalOnNodesChange = state.onNodesChange;
  const originalOnEdgesChange = state.onEdgesChange;

  useFlowStore.setState({
    setNodes: (nodes: Node[]) => {
      originalSetNodes(nodes);

      if (!session || isApplyingRemoteUpdate) return;
      pushAllNodesToYjs(useFlowStore.getState().nodes);
    },

    setEdges: (edges: Edge[]) => {
      originalSetEdges(edges);

      if (!session || isApplyingRemoteUpdate) return;
      pushAllEdgesToYjs(useFlowStore.getState().edges);
    },

    addNode: (node: Node) => {
      originalAddNode(node);

      if (!session || isApplyingRemoteUpdate) return;

      session.ydoc.transact(() => {
        session!.yNodes.set(node.id, cleanNodeForSync(node));
      });
    },

    addEdge: (edge: Edge) => {
      originalAddEdge(edge);

      if (!session || isApplyingRemoteUpdate) return;

      session.ydoc.transact(() => {
        session!.yEdges.set(edge.id, cleanEdgeForSync(edge));
      });
    },

    updateNodeData: (nodeId: string, newData: Record<string, any>) => {
      originalUpdateNodeData(nodeId, newData);

      if (!session || isApplyingRemoteUpdate) return;

      const updatedNode = useFlowStore.getState().nodes.find((n) => n.id === nodeId);
      if (!updatedNode) return;

      session.ydoc.transact(() => {
        session!.yNodes.set(nodeId, cleanNodeForSync(updatedNode));
      });
    },

    onNodesChange: (changes: NodeChange[]) => {
      originalOnNodesChange(changes);

      if (!session || isApplyingRemoteUpdate) return;

      const currentNodes = useFlowStore.getState().nodes;

      const hasStructuralOrPositionChange = changes.some(
        (change) =>
          change.type === 'position' ||
          change.type === 'remove' ||
          change.type === 'add' ||
          change.type === 'replace'
      );

      if (!hasStructuralOrPositionChange) return;

      pushAllNodesToYjs(currentNodes);
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      originalOnEdgesChange(changes);

      if (!session || isApplyingRemoteUpdate) return;

      const currentEdges = useFlowStore.getState().edges;

      if (changes.length === 0) return;
      pushAllEdgesToYjs(currentEdges);
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

  return s;
}

export function disableTestCollaboration() {
  restoreActions?.();
  restoreActions = null;

  if (session) {
    session.destroy();
  }
}
