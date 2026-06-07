// features/graph-editor/components/GraphEditor.tsx
'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  useStore,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Copy, Trash2, ClipboardPaste } from 'lucide-react';
import { useGraphStore } from '../store/graph-store';
import { FlowNode } from './node';
import { NodeUpdateContext, type NodeUpdatePayload } from './node';
import { NODES } from '@/features/graph-builder/lib/data/nodes';

function parseGraph(value: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const parsed = JSON.parse(value || '{}');
    return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

// ------------------------------------------------------------------
// Context: actions exposed to children (Palette, etc.)
// ------------------------------------------------------------------
export interface GraphActions {
  addNodeAtCenter: (nodeType: string) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
}

export const GraphActionsContext = React.createContext<GraphActions>({
  addNodeAtCenter: () => {},
  deleteSelected: () => {},
  copySelected: () => {},
  paste: () => {},
});

function GraphEditorInner({ children }: { children?: React.ReactNode }) {
  const graphString = useGraphStore((s) => s.currentGraphString());
  const updateGraphString = useGraphStore((s) => s.updateGraphString);
  const { nodes, edges } = parseGraph(graphString);

  const { screenToFlowPosition } = useReactFlow();

  // Mobile bar visibility: true if anything is selected inside ReactFlow
  const hasSelection = useStore(
    useCallback(
      (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
      []
    )
  );

  // In-memory clipboard (system clipboard is avoided because ASTs are not plain text)
  const clipboardRef = useRef<{ nodes: Node[]; offset: number }>({
    nodes: [],
    offset: 0,
  });

  const persist = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      updateGraphString(JSON.stringify({ nodes: newNodes, edges: newEdges }));
    },
    [updateGraphString]
  );

  // ------------------------------------------------------------------
  // Center spawn
  // ------------------------------------------------------------------
  const addNodeAtCenter = useCallback(
    (nodeType: string) => {
      const def = NODES.find((n) => n.name === nodeType);
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: 'flowNode',
        position: {
          x: center.x - (def?.width ? def.width / 2 : 130),
          y: center.y - 40,
        },
        data: {
          nodeType,
          templates: {},
          state: { ...(def?.defaultState || {}) },
        },
        selected: true,
      };

      // Deselect others so only the new node is selected
      const newNodes = nodes
        .map((n) => ({ ...n, selected: false }))
        .concat(newNode);

      persist(newNodes, edges);
    },
    [nodes, edges, persist, screenToFlowPosition]
  );

  // ------------------------------------------------------------------
  // Delete selected (nodes + edges, plus edges hanging off deleted nodes)
  // ------------------------------------------------------------------
  const deleteSelected = useCallback(() => {
    const removedNodeIds = new Set(
      nodes.filter((n) => n.selected).map((n) => n.id)
    );

    const newNodes = nodes.filter((n) => !n.selected);
    const newEdges = edges.filter(
      (e) =>
        !e.selected &&
        !removedNodeIds.has(e.source) &&
        !removedNodeIds.has(e.target)
    );

    persist(newNodes, newEdges);
  }, [nodes, edges, persist]);

  // ------------------------------------------------------------------
  // Copy / Paste
  // ------------------------------------------------------------------
  const copySelected = useCallback(() => {
    const toCopy = nodes.filter((n) => n.selected);
    if (toCopy.length === 0) return;

    // Deep clone so we don't share references with the live graph
    clipboardRef.current = {
      nodes: toCopy.map((n) => JSON.parse(JSON.stringify(n))),
      offset: 0,
    };
  }, [nodes]);

  const paste = useCallback(() => {
    const { nodes: copied } = clipboardRef.current;
    if (copied.length === 0) return;

    clipboardRef.current.offset += 40;
    const offset = clipboardRef.current.offset;

    const newNodes = copied.map((n) => ({
      ...n,
      id: `${n.id}_paste_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: true,
    }));

    const deselectedOld = nodes.map((n) => ({ ...n, selected: false }));
    persist([...deselectedOld, ...newNodes], edges);
  }, [nodes, edges, persist]);

  // ------------------------------------------------------------------
  // Keyboard listeners
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !typing) {
        e.preventDefault();
        copySelected();
        return;
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !typing) {
        e.preventDefault();
        paste();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected, copySelected, paste]);

  // ------------------------------------------------------------------
  // ReactFlow callbacks
  // ------------------------------------------------------------------
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const newNodes = applyNodeChanges(changes, nodes);
      updateGraphString(JSON.stringify({ nodes: newNodes, edges }));
    },
    [nodes, edges, updateGraphString]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const newEdges = applyEdgeChanges(changes, edges);
      updateGraphString(JSON.stringify({ nodes, edges: newEdges }));
    },
    [nodes, edges, updateGraphString]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdges = addEdge({ ...params, animated: true }, edges);
      updateGraphString(JSON.stringify({ nodes, edges: newEdges }));
    },
    [nodes, edges, updateGraphString]
  );

  const updateNodeData = useCallback(
    (nodeId: string, patch: NodeUpdatePayload) => {
      const newNodes = nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      );
      updateGraphString(JSON.stringify({ nodes: newNodes, edges }));
    },
    [nodes, edges, updateGraphString]
  );

  return (
    <NodeUpdateContext.Provider value={updateNodeData}>
      <GraphActionsContext.Provider
        value={{ addNodeAtCenter, deleteSelected, copySelected, paste }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ flowNode: FlowNode }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          snapGrid={[20, 20]}
          deleteKeyCode={false} // handled manually so edges are covered too
        >
          {children}

          <Background gap={16} size={1} />
          <Controls />
          <MiniMap />

          {/* Mobile / touch action bar */}
          {hasSelection && (
            <Panel position="bottom-center" style={{ marginBottom: 24 }}>
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full shadow-lg px-4 py-2">
                <button
                  onClick={copySelected}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={paste}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                  title="Paste"
                >
                  <ClipboardPaste size={18} />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                  onClick={deleteSelected}
                  className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </GraphActionsContext.Provider>
    </NodeUpdateContext.Provider>
  );
}

export function GraphEditor({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlowProvider>
        <GraphEditorInner>{children}</GraphEditorInner>
      </ReactFlowProvider>
    </div>
  );
}
