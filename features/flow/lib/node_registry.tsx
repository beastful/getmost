'use client';

import { useNodeConnections, useNodeId, useNodesData } from '@xyflow/react';
import * as React from 'react';
import { evaluateNode } from '../components/editor';
import { useFlowStore } from '../store/flow-store';
import { Button } from '@base-ui/react';

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

export type NodePort = {
    id: string;
    name: string;
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
    Visual: (ctx: NodeVisualContext) => React.ReactNode;
};

function collectUpstreamNodeIds(
    startNodeId: string,
    edges: { source: string; target: string }[]
) {
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

function useReactiveInput(inputId: string) {
    const nodeId = useNodeId();

    const nodes = useFlowStore((s) => s.nodes);
    const edges = useFlowStore((s) => s.edges);

    return React.useMemo(() => {
        if (!nodeId) return null;

        const inputEdge = edges.find(
            (e) => e.target === nodeId && e.targetHandle === inputId
        );

        if (!inputEdge?.source) return null;

        const upstreamIds = collectUpstreamNodeIds(inputEdge.source, edges);

        const scopedNodes = nodes.filter((n) => upstreamIds.has(n.id));
        const scopedEdges = edges.filter(
            (e) => upstreamIds.has(e.source) || upstreamIds.has(e.target)
        );

        return evaluateNode(inputEdge.source, inputEdge.sourceHandle ?? 'out', {
            nodes: scopedNodes,
            edges: scopedEdges,
        });
    }, [nodeId, inputId, nodes, edges]);
}

export const NODE_REGISTRY: NodeDefinition[] = [
    {
        id: 'number',
        name: 'Number',
        category: 'Basic',
        description: 'Primitive number value',
        inputs: [],
        outputs: [{ id: 'out', name: 'Value' }],
        defaultState: { value: 42 },
        template: ({ getState }) => ['number', getState('value')],
        Visual: ({ state, setState }) => {
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
        },
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
        Visual: ({ getInput }) => {
            const inp1 = useReactiveInput('inp1')
            const inp2 = useReactiveInput('inp2')

            return (
                <div className="space-y-1 text-xs text-muted-foreground">
                    <Button onClick={() => {
                        alert(getInput("inp1"))
                    }}>
                        Alert value
                    </Button>
                    <div>inp1: {JSON.stringify(inp1)}</div>
                    <div>inp2: {JSON.stringify(inp2)}</div>
                </div>
            );
        },
    },
];

export const NODE_REGISTRY_MAP = Object.fromEntries(
    NODE_REGISTRY.map((node) => [node.id, node])
) as Record<string, NodeDefinition>;

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

export function createNodeInstance(
    definitionId: string,
    position = { x: 300, y: 200 }
) {
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
        } satisfies EditorNodeData,
        type: 'customNode',
    };
}
