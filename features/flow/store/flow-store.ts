'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  addEdge as rfAddEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import type { EditorNodeData } from '@/features/flow/lib/node_registry';

export type FlowNode = Node<EditorNodeData>;
export type FlowEdge = Edge;

type FlowStore = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  isSynced: boolean;

  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  replaceGraph: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  resetGraph: () => void;
  setIsSynced: (value: boolean) => void;

  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;

  addNode: (node: FlowNode) => void;
  upsertNode: (node: FlowNode) => void;
  removeNode: (nodeId: string) => void;

  addEdge: (edge: FlowEdge | Connection) => void;
  upsertEdge: (edge: FlowEdge) => void;
  removeEdge: (edgeId: string) => void;

  updateNodeData: (nodeId: string, patch: Partial<EditorNodeData>) => void;
};

function sameNodeIds(a: FlowNode[], b: FlowNode[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

function sameEdgeIds(a: FlowEdge[], b: FlowEdge[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

export const useFlowStore = create<FlowStore>()(
  subscribeWithSelector((set) => ({
    nodes: [],
    edges: [],
    isSynced: false,

    setNodes: (nodes) =>
      set((state) => {
        if (state.nodes === nodes) return state;
        if (sameNodeIds(state.nodes, nodes)) return { nodes };
        return { nodes };
      }),

    setEdges: (edges) =>
      set((state) => {
        if (state.edges === edges) return state;
        if (sameEdgeIds(state.edges, edges)) return { edges };
        return { edges };
      }),

    replaceGraph: (nodes, edges) =>
      set((state) => {
        if (state.nodes === nodes && state.edges === edges) return state;
        return { nodes, edges };
      }),

    resetGraph: () =>
      set((state) => {
        if (
          state.nodes.length === 0 &&
          state.edges.length === 0 &&
          state.isSynced === false
        ) {
          return state;
        }

        return { nodes: [], edges: [], isSynced: false };
      }),

    setIsSynced: (value) =>
      set((state) => {
        if (state.isSynced === value) return state;
        return { isSynced: value };
      }),

    onNodesChange: (changes) =>
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes),
      })),

    onEdgesChange: (changes) =>
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      })),

    addNode: (node) =>
      set((state) => {
        if (state.nodes.some((n) => n.id === node.id)) return state;
        return { nodes: [...state.nodes, node] };
      }),

    upsertNode: (node) =>
      set((state) => {
        const index = state.nodes.findIndex((n) => n.id === node.id);
        if (index === -1) {
          return { nodes: [...state.nodes, node] };
        }

        const nextNodes = [...state.nodes];
        nextNodes[index] = node;
        return { nodes: nextNodes };
      }),

    removeNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      })),

    addEdge: (edge) =>
      set((state) => ({
        edges: rfAddEdge(edge, state.edges),
      })),

    upsertEdge: (edge) =>
      set((state) => {
        const index = state.edges.findIndex((e) => e.id === edge.id);
        if (index === -1) {
          return { edges: [...state.edges, edge] };
        }

        const nextEdges = [...state.edges];
        nextEdges[index] = edge;
        return { edges: nextEdges };
      }),

    removeEdge: (edgeId) =>
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== edgeId),
      })),

    updateNodeData: (nodeId, patch) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node
        ),
      })),
  }))
);
