"use client";

import React, { useCallback, useRef, useEffect } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Copy, Trash2, ClipboardPaste, Plus } from "lucide-react";
import { useGraphStore } from "./store";
import { FlowNode } from "./better-node";
import { NodeUpdateContext, type NodeUpdatePayload } from "./better-node";
import { getAllNodes, getNode } from "./BJLR";

function parseGraph(value: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const parsed = JSON.parse(value || "{}");
    return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function GraphEditorInner() {
  const graphString = useGraphStore((s) => s.currentGraphString());
  const updateGraphString = useGraphStore((s) => s.updateGraphString);
  const { nodes, edges } = parseGraph(graphString);

  const { screenToFlowPosition } = useReactFlow();

  const hasSelection = useStore(
    useCallback(
      (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
      []
    )
  );

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

  const addNodeAtCenter = useCallback(
    (nodeType: string) => {
      const def = getNode(nodeType);
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: "flowNode",
        position: {
          x: center.x - (def?.width ? def.width / 2 : 130),
          y: center.y - 40,
        },
        data: {
          nodeType,
          templates: {},
          state: { ...(def?.state || {}) },
        },
        selected: true,
      };

      const newNodes = nodes.map((n) => ({ ...n, selected: false })).concat(newNode);
      persist(newNodes, edges);
    },
    [nodes, edges, persist, screenToFlowPosition]
  );

  const deleteSelected = useCallback(() => {
    const removedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));

    const newNodes = nodes.filter((n) => !n.selected);
    const newEdges = edges.filter(
      (e) =>
        !e.selected &&
        !removedNodeIds.has(e.source) &&
        !removedNodeIds.has(e.target)
    );

    persist(newNodes, newEdges);
  }, [nodes, edges, persist]);

  const copySelected = useCallback(() => {
    const toCopy = nodes.filter((n) => n.selected);
    if (toCopy.length === 0) return;

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
      id: `${n.id}_paste_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: true,
    }));

    const deselectedOld = nodes.map((n) => ({ ...n, selected: false }));
    persist([...deselectedOld, ...newNodes], edges);
  }, [nodes, edges, persist]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && !typing) {
        e.preventDefault();
        copySelected();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v" && !typing) {
        e.preventDefault();
        paste();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, copySelected, paste]);

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

  const available = getAllNodes();

  return (
    <NodeUpdateContext.Provider value={updateNodeData}>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ flowNode: FlowNode }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          snapGrid={[20, 20]}
          deleteKeyCode={false}
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap />

          <Panel position="top-left">
            <div className="flex max-w-[320px] flex-wrap gap-2 rounded-xl border bg-white/95 p-3 shadow-sm backdrop-blur">
              {available.map((node) => (
                <button
                  key={node.name}
                  onClick={() => addNodeAtCenter(node.name)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                >
                  <Plus size={14} />
                  {node.name}
                </button>
              ))}
            </div>
          </Panel>

          {hasSelection && (
            <Panel position="bottom-center" style={{ marginBottom: 24 }}>
              <div className="flex items-center gap-2 rounded-full border bg-white/90 px-4 py-2 shadow-lg backdrop-blur-sm">
                <button
                  onClick={copySelected}
                  className="rounded-full p-2 transition-colors hover:bg-slate-100"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
                <button
                  onClick={paste}
                  className="rounded-full p-2 transition-colors hover:bg-slate-100"
                  title="Paste"
                >
                  <ClipboardPaste size={18} />
                </button>
                <div className="mx-1 h-5 w-px bg-slate-200" />
                <button
                  onClick={deleteSelected}
                  className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </NodeUpdateContext.Provider>
  );
}

export function GraphEditor() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <GraphEditorInner />
      </ReactFlowProvider>
    </div>
  );
}