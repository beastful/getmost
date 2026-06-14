'use client';

import { memo, useCallback, useEffect, useMemo } from 'react';
import {
    ReactFlow,
    Panel,
    Handle,
    Position,
    useNodeId,
    type Connection,
    type Edge,
    type Node,
    type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { useFlowStore } from './store';
import { disableTestCollaboration, enableTestCollaboration } from './sync';

type TemplateValue = any;

type InputDefinition = {
    id: string;
    name: string;
};

type OutputDefinition = {
    id: string;
    name: string;
    template: (ctx: TemplateContext) => TemplateValue;
};

type TemplateContext = {
    nodeId: string;
    node: Node;
    state: <T = any>(key: string) => T;
    input: (inputHandleId: string) => TemplateValue | undefined;
    inputs: () => Record<string, TemplateValue | undefined>;
    outputId: string;
};

type VisualProps = {
    nodeId: string;
    node: Node;
    state: Record<string, any>;
    setState: (key: string, value: any) => void;
    getInputTemplate: (inputHandleId: string) => TemplateValue | undefined;
    getAllInputTemplates: () => Record<string, TemplateValue | undefined>;
};

type NodeDefinition = {
    id: string;
    name: string;
    category: string;
    inputs: InputDefinition[];
    outputs: OutputDefinition[];
    defaultState: Record<string, any>;
    Visual?: React.ComponentType<VisualProps>;
};

function NumberVisual({ state, setState }: VisualProps) {
    return (
        <div className="space-y-2">
            <div className="text-xs text-neutral-500">Number node</div>
            <input
                className="nodrag w-full rounded border px-2 py-1 text-sm"
                type="number"
                value={state.value ?? ''}
                onChange={(e) => setState('value', Number(e.target.value))}
            />
            <div className="text-xs text-neutral-500">
                State value: {String(state.value ?? '')}
            </div>
        </div>
    );
}

function SumVisual({ getInputTemplate, getAllInputTemplates }: VisualProps) {
    const inp1 = getInputTemplate('inp1');
    const inp2 = getInputTemplate('inp2');
    const all = getAllInputTemplates();

    return (
        <div className="space-y-2">
            <div className="text-xs text-neutral-500">Sum node</div>
            <div className="text-xs">inp1 template:</div>
            <pre className="max-h-24 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
                {JSON.stringify(inp1, null, 2)}
            </pre>

            <div className="text-xs">inp2 template:</div>
            <pre className="max-h-24 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
                {JSON.stringify(inp2, null, 2)}
            </pre>

            <div className="text-xs">all inputs:</div>
            <pre className="max-h-24 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
                {JSON.stringify(all, null, 2)}
            </pre>
        </div>
    );
}

const NODES: NodeDefinition[] = [
    {
        id: 'number',
        name: 'Number',
        category: 'Basic',
        inputs: [],
        outputs: [
            {
                id: 'out',
                name: 'Value',
                template: ({ state }) => ['number', state('value')],
            },
        ],
        defaultState: { value: 42 },
        Visual: NumberVisual,
    },
    {
        id: 'sum',
        name: 'Sum',
        category: 'Basic',
        inputs: [
            { id: 'inp1', name: 'Value 1' },
            { id: 'inp2', name: 'Value 2' },
        ],
        outputs: [
            {
                id: 'out',
                name: 'Value',
                template: ({ input }) => ['sum', input('inp1'), input('inp2')],
            },
        ],
        defaultState: {},
        Visual: SumVisual,
    },
];

function getNodeById(nodes: Node[], nodeId: string) {
    return nodes.find((node) => node.id === nodeId);
}

function getDefinitionByNode(node: Node) {
    return NODES.find((def) => def.id === node.data?._definitionId);
}

function getIncomingEdge(edges: Edge[], nodeId: string, inputHandleId: string) {
    return edges.find(
        (edge) => edge.target === nodeId && edge.targetHandle === inputHandleId
    );
}

function buildTemplateEngine(nodes: Node[], edges: Edge[]) {
    const cache = new Map<string, TemplateValue>();
    const visiting = new Set<string>();

    function getTemplate(nodeId: string, outputHandleId?: string): TemplateValue | undefined {
        const cacheKey = `${nodeId}:${outputHandleId ?? '__default__'}`;

        if (cache.has(cacheKey)) return cache.get(cacheKey);

        if (visiting.has(cacheKey)) {
            throw new Error(`Cycle detected at ${cacheKey}`);
        }

        const node = getNodeById(nodes, nodeId);
        if (!node) return undefined;

        const def = getDefinitionByNode(node);
        if (!def) return undefined;

        const output = def.outputs.find((o) => o.id === outputHandleId) ?? def.outputs[0];
        if (!output) return undefined;

        visiting.add(cacheKey);

        const state = <T = any>(key: string): T => node.data?.state?.[key];

        const input = (inputHandleId: string): TemplateValue | undefined => {
            const edge = getIncomingEdge(edges, nodeId, inputHandleId);
            if (!edge?.source) return undefined;
            return getTemplate(edge.source, edge.sourceHandle ?? undefined);
        };

        const inputs = (): Record<string, TemplateValue | undefined> =>
            Object.fromEntries(def.inputs.map((inp) => [inp.id, input(inp.id)]));

        const result = output.template({
            nodeId,
            node,
            state,
            input,
            inputs,
            outputId: output.id,
        });

        cache.set(cacheKey, result);
        visiting.delete(cacheKey);

        return result;
    }

    function getInputTemplate(nodeId: string, inputHandleId: string) {
        const edge = getIncomingEdge(edges, nodeId, inputHandleId);
        if (!edge?.source) return undefined;
        return getTemplate(edge.source, edge.sourceHandle ?? undefined);
    }

    function getAllInputTemplates(nodeId: string) {
        const node = getNodeById(nodes, nodeId);
        if (!node) return {};

        const def = getDefinitionByNode(node);
        if (!def) return {};

        return Object.fromEntries(
            def.inputs.map((inp) => [inp.id, getInputTemplate(nodeId, inp.id)])
        );
    }

    return {
        getTemplate,
        getInputTemplate,
        getAllInputTemplates,
    };
}

const CustomNode = memo(function CustomNode({ id, data }: NodeProps) {
    const nodeId = useNodeId() ?? id;

    const nodes = useFlowStore((s) => s.nodes);
    const edges = useFlowStore((s) => s.edges);
    const updateNodeData = useFlowStore((s) => s.updateNodeData);

    const node = useMemo(() => getNodeById(nodes, nodeId), [nodes, nodeId]);
    const definition = useMemo(
        () => NODES.find((def) => def.id === data._definitionId),
        [data._definitionId]
    );

    const engine = useMemo(() => buildTemplateEngine(nodes, edges), [nodes, edges]);

    const setState = useCallback(
        (key: string, value: any) => {
            updateNodeData(nodeId, {
                state: {
                    ...(data.state ?? {}),
                    [key]: value,
                },
            });
        },
        [updateNodeData, nodeId, data.state]
    );

    const getInputTemplate = useCallback(
        (inputHandleId: string) => engine.getInputTemplate(nodeId, inputHandleId),
        [engine, nodeId]
    );

    const getAllInputTemplates = useCallback(
        () => engine.getAllInputTemplates(nodeId),
        [engine, nodeId]
    );

    const ownTemplate = useMemo(
        () => engine.getTemplate(nodeId),
        [engine, nodeId]
    );

    if (!definition || !node) {
        return (
            <div className="rounded border bg-white p-3 text-sm shadow">
                Unknown node
            </div>
        );
    }

    const Visual = definition.Visual;

    return (
        <div className="min-w-[260px] rounded-xl border bg-white shadow-sm">
            <div className="border-b px-3 py-2">
                <div className="text-sm font-medium">{definition.name}</div>
                <div className="text-xs text-neutral-500">{definition.category}</div>
            </div>

            <div className="flex">
                <div className="flex w-28 flex-col gap-2 p-3">
                    {definition.inputs.map((input) => (
                        <div
                            key={input.id}
                            className="relative rounded bg-green-50 px-2 py-2 text-xs"
                        >
                            <Handle
                                id={input.id}
                                type="target"
                                position={Position.Left}
                                style={{
                                    left: 0,
                                    transform: 'translate(-50%, -50%)',
                                    top: '50%',
                                    border: 'none',
                                    width: 10,
                                    height: 10,
                                }}
                            />
                            {input.name}
                        </div>
                    ))}
                </div>

                <div className="min-w-0 flex-1 p-3">
                    {Visual ? (
                        <Visual
                            nodeId={nodeId}
                            node={node}
                            state={data.state ?? {}}
                            setState={setState}
                            getInputTemplate={getInputTemplate}
                            getAllInputTemplates={getAllInputTemplates}
                        />
                    ) : null}

                    <div className="mt-3">
                        <div className="mb-1 text-xs text-neutral-500">Own template</div>
                        <pre className="max-h-32 overflow-auto rounded bg-neutral-50 p-2 text-[10px]">
                            {JSON.stringify(ownTemplate, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="flex w-28 flex-col gap-2 p-3">
                    {definition.outputs.map((output) => (
                        <div
                            key={output.id}
                            className="relative rounded bg-yellow-50 px-2 py-2 text-xs"
                        >
                            <Handle
                                id={output.id}
                                type="source"
                                position={Position.Right}
                                style={{
                                    left: 'unset',
                                    right: 0,
                                    transform: 'translate(50%, -50%)',
                                    top: '50%',
                                    border: 'none',
                                    width: 10,
                                    height: 10,
                                }}
                            />
                            {output.name}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

function createFlowNode(definitionId: string): Node {
    const def = NODES.find((n) => n.id === definitionId);
    if (!def) {
        throw new Error(`Unknown definition: ${definitionId}`);
    }

    return {
        id: crypto.randomUUID(),
        position: {
            x: 250 + Math.random() * 200,
            y: 150 + Math.random() * 200,
        },
        type: 'customNode',
        data: {
            _definitionId: def.id,
            state: { ...def.defaultState },
            label: def.name,
        },
    };
}

export default function TestTemplateEditor() {
    const nodes = useFlowStore((s) => s.nodes);
    const edges = useFlowStore((s) => s.edges);
    const onNodesChange = useFlowStore((s) => s.onNodesChange);
    const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
    const addNode = useFlowStore((s) => s.addNode);
    const addEdge = useFlowStore((s) => s.addEdge);

    const onConnect = useCallback(
        (connection: Connection) => {
            const edge = {
                ...connection,
                id: crypto.randomUUID(),
            } as Edge;

            addEdge(edge);
        },
        [addEdge]
    );

    useEffect(() => {
        const s = enableTestCollaboration();
        return () => disableTestCollaboration();
    }, []);

    return (
        <div className="h-[100vh] w-full">
            <ReactFlow
                nodeTypes={{ customNode: CustomNode }}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
            >
                <Panel position="bottom-center" className="flex gap-2 rounded border bg-white p-2 shadow">
                    <Button onClick={() => addNode(createFlowNode('number'))}>
                        Add number
                    </Button>
                    <Button onClick={() => addNode(createFlowNode('sum'))}>
                        Add sum
                    </Button>
                </Panel>
            </ReactFlow>
        </div>
    );
}