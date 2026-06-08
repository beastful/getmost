"use client";

import { create } from "zustand";
import { getAllNodes } from "./BJLR";

export type GraphNode = {
  id: string;
  type: "flowNode";
  position: { x: number; y: number };
  data: {
    nodeType: string;
    state?: Record<string, any>;
    templates?: Record<string, any>;
  };
  selected?: boolean;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  selected?: boolean;
  animated?: boolean;
};

type GraphDoc = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type GraphStore = {
  graph: GraphDoc;
  graphString: string;
  version: number;

  currentGraphString: () => string;
  updateGraphString: (value: string) => void;

  addNode: (nodeType: string, position?: { x: number; y: number }) => void;
  refreshNodeTypes: () => void;
  availableNodes: () => ReturnType<typeof getAllNodes>;
};

function safeParse(value: string): GraphDoc {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      nodes: parsed.nodes || [],
      edges: parsed.edges || [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  graph: { nodes: [], edges: [] },
  graphString: JSON.stringify({ nodes: [], edges: [] }),
  version: 0,

  currentGraphString: () => get().graphString,

  updateGraphString: (value) => {
    const parsed = safeParse(value);
    set({
      graphString: value,
      graph: parsed,
    });
  },

  addNode: (nodeType, position = { x: 200, y: 120 }) => {
    const { graph } = get();

    const newNode: GraphNode = {
      id: `${nodeType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: "flowNode",
      position,
      data: {
        nodeType,
        state: {},
        templates: {},
      },
      selected: true,
    };

    const next = {
      nodes: graph.nodes.map((n) => ({ ...n, selected: false })).concat(newNode),
      edges: graph.edges,
    };

    set({
      graph: next,
      graphString: JSON.stringify(next),
    });
  },

  refreshNodeTypes: () => set((s) => ({ version: s.version + 1 })),

  availableNodes: () => getAllNodes(),
}));