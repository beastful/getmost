// features/graph-editor/components/GraphEditor.tsx
'use client';

import React, { useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '../store/graph-store';
import { FlowNode } from './node';
import { NodeUpdateContext, type NodeUpdatePayload } from './node';

function parseGraph(value: string): { nodes: Node[]; edges: Edge[] } {
  try {
    const parsed = JSON.parse(value || '{}');
    return { nodes: parsed.nodes || [], edges: parsed.edges || [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function GraphEditorInner({ children }: { children?: React.ReactNode }) {
  const graphString = useGraphStore((s) => s.currentGraphString());
  const updateGraphString = useGraphStore((s) => s.updateGraphString);
  const { nodes, edges } = parseGraph(graphString);

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{ flowNode: FlowNode }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        {children}
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
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
