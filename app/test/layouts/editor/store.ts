import { create } from 'zustand';
import { applyEdgeChanges, applyNodeChanges, type Node, type Edge, type NodeChange, type EdgeChange } from '@xyflow/react';

interface FlowStore {
    nodes: Node[];
    edges: Edge[];
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    addNode: (node: Node) => void;
    addEdge: (edge: Edge) => void;
    updateNodeData: (nodeId: string, newData: Partial<any>) => void;
}

export const useFlowStore = create<FlowStore>((set, get) => ({
    nodes: [],
    edges: [],

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    addNode: (node) => {
        set({ nodes: [...get().nodes, node] });
    },

    addEdge: (edge) => {
        set({ edges: [...get().edges, edge] });
    },

    updateNodeData: (nodeId: string, newData: Partial<any>) => {
        set((state) => ({
            nodes: state.nodes.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...newData,
                        },
                    };
                }
                return node;
            }),
        }));
    },
}));