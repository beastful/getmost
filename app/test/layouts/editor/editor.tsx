'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    type Connection,
    type Edge,
    type Node,
    ColorMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ModeToggle } from "@/features/theming/components/mode-toggle";
import { useTheme } from "next-themes"
import MobileFullscreenWrapper from './mobile-guard';

// Define initial nodes
const initialNodes: Node[] = [
    {
        id: '1',
        position: { x: 100, y: 100 },
        data: { label: 'Node 1' },
    },
    {
        id: '2',
        position: { x: 300, y: 200 },
        data: { label: 'Node 2' },
    },
];

// Define initial edges
const initialEdges: Edge[] = [
    {
        id: 'e1-2',
        source: '1',
        target: '2',
        animated: true,
    },
];

export default function TestEditor({ children }: { children: ReactNode }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const { theme } = useTheme();

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <MobileFullscreenWrapper>
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        colorMode={theme as ColorMode || 'light'}
                        fitView
                    >
                        {children}
                        <Background />
                        <Controls style={{ bottom: "50px" }} />
                    </ReactFlow>
                </div>
            </div>
        </MobileFullscreenWrapper>
    );
}


