// flow-node.tsx
"use client";

import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    Handle,
    Position,
    useStore,
    type NodeProps,
} from "@xyflow/react";
import { NODES } from "@/features/graph-builder/lib/data/nodes";       // adjust import to your nodes definition
import { GripVertical } from "lucide-react";

// ----------------------------------------------------------------------
// Context for updating node data from within a FlowNode
// ----------------------------------------------------------------------
export interface NodeUpdatePayload {
    templates?: Record<string, any>;
    state?: Record<string, any>;
}

export const NodeUpdateContext = React.createContext<
    (nodeId: string, patch: NodeUpdatePayload) => void
>(() => {});

// ----------------------------------------------------------------------
// FlowNode component – works with GraphEditor's node type "flowNode"
// ----------------------------------------------------------------------
export const FlowNode = ({ id, data, selected }: NodeProps) => {
    const nodeDef = NODES.find((n) => n.name === data.nodeType);
    if (!nodeDef) return null;

    const updateNodeData = useContext(NodeUpdateContext);

    // Local state – merged with any existing state from node data
    const [state, setLocalState] = useState(() => ({
        ...nodeDef.defaultState,
        ...(data.state || {}),
    }));

    // Subscribe to edges and fetch incoming values (inputs)
    const inputs = useStore((store: any) => {
        const result: Record<string, any> = {};
        const edges = store.edges || [];
        for (const input of nodeDef.inputs) {
            const edge = edges.find(
                (e: any) => e.target === id && e.targetHandle === input.id
            );
            if (edge) {
                const src = store.nodeLookup?.get?.(edge.source);
                result[input.id] = src?.data?.templates?.[edge.sourceHandle!];
            }
        }
        return result;
    });

    // Compute output templates based on inputs and current state
    const templates = useMemo(() => {
        const result: Record<string, any> = {};
        for (const output of nodeDef.outputs) {
            try {
                result[output.id] = output.template(inputs, state);
            } catch {
                result[output.id] = null;
            }
        }
        return result;
    }, [inputs, state, nodeDef.outputs]);

    // Sync local state & templates back to the node's data
    const didMount = useRef(false);
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true;
            return;
        }
        // Only update if something actually changed
        if (
            JSON.stringify(data.templates) === JSON.stringify(templates) &&
            JSON.stringify(data.state) === JSON.stringify(state)
        ) {
            return;
        }
        updateNodeData(id, { templates, state });
    }, [templates, state, id, updateNodeData, data.templates, data.state]);

    const setState = useCallback(
        (key: string, val: any) => setLocalState((prev) => ({ ...prev, [key]: val })),
        []
    );

    const getTemplate = useCallback(
        (outputId: string) => templates[outputId],
        [templates]
    );

    const getInputTemplate = useCallback(
        (inputId: string) => inputs[inputId],
        [inputs]
    );

    const Visual = useMemo(() => React.memo(nodeDef.visual), [nodeDef.visual]);

    // ------------------------------------------------------------------
    // Uncontrolled / free‑form node (minimal, no card layout)
    // ------------------------------------------------------------------
    if (nodeDef.controlled === false) {
        return (
            <div
                className="relative group"
                style={{
                    width: "90px",
                    height: "20px",
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    boxShadow: "none",
                }}
            >
                {/* Drag handle strip */}
                <div
                    className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center duration-150 pointer-events-none"
                    style={{
                        height: 18,
                        marginTop: -9,
                        cursor: "grab",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "2px 10px",
                            background: "rgba(15, 23, 42, 0.75)",
                            borderRadius: 99,
                            backdropFilter: "blur(4px)",
                        }}
                    >
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                style={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    background: "#e2e8f0",
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Input handles */}
                {nodeDef.inputs.map((input) => (
                    <Handle
                        key={input.id}
                        type="target"
                        position={Position.Left}
                        id={input.id}
                        style={{
                            position: "absolute",
                            left: -6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 8,
                            height: 8,
                            background: "#4f46e5",
                            border: "2px solid #ffffff",
                            borderRadius: "50%",
                            zIndex: 10,
                            cursor: "crosshair",
                            opacity: 0.6,
                        }}
                    />
                ))}

                {/* Output handles */}
                {nodeDef.outputs.map((output) => (
                    <Handle
                        key={output.id}
                        type="source"
                        position={Position.Right}
                        id={output.id}
                        style={{
                            position: "absolute",
                            right: -6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 8,
                            height: 8,
                            background: "#10b981",
                            border: "2px solid #ffffff",
                            borderRadius: "50%",
                            zIndex: 10,
                            cursor: "crosshair",
                            opacity: 0.6,
                        }}
                    />
                ))}

                <div className="nodrag nowheel" onPointerDown={(e) => e.stopPropagation()}>
                    <Visual
                        state={state}
                        setState={setState}
                        inputs={inputs}
                        getTemplate={getTemplate}
                        getInputTemplate={getInputTemplate}
                    />
                </div>
            </div>
        );
    }

    // ------------------------------------------------------------------
    // Controlled / standard node (card with header, I/O chips)
    // ------------------------------------------------------------------
    return (
        <div
            className={`bg-white border-2 rounded-xl shadow-sm transition-all flex flex-col ${
                selected ? "border-indigo-400 shadow-md" : "border-gray-200"
            }`}
            style={{ width: nodeDef.width || 260 }}
        >
            {/* Header */}
            <div className="h-[40px] px-3 border-b-2 border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 flex items-center justify-center text-gray-500">
                        <nodeDef.icon />
                    </div>
                    <span className="font-semibold text-sm text-gray-700">{nodeDef.name}</span>
                </div>
            </div>

            {/* I/O chips with Handles */}
            {(nodeDef.inputs.length > 0 || nodeDef.outputs.length > 0) && (
                <div className="relative px-3 py-2.5 flex justify-between gap-2 border-b border-gray-100 shrink-0">
                    <div className="flex flex-col gap-1.5 items-start min-w-0">
                        {nodeDef.inputs.map((input) => (
                            <div key={input.id} className="relative flex items-center h-5">
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={input.id}
                                    style={{
                                        position: "absolute",
                                        left: -18,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: 10,
                                        height: 10,
                                        background: "#4f46e5",
                                        border: "2px solid #ffffff",
                                        borderRadius: "50%",
                                        zIndex: 10,
                                        cursor: "crosshair",
                                    }}
                                />
                                <div className="inline-flex items-center bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                    {input.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-1.5 items-end min-w-0">
                        {nodeDef.outputs.map((output) => (
                            <div key={output.id} className="relative flex items-center h-5 justify-end">
                                <div className="inline-flex items-center bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                    {output.name}
                                </div>
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={output.id}
                                    style={{
                                        position: "absolute",
                                        right: -18,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: 10,
                                        height: 10,
                                        background: "#10b981",
                                        border: "2px solid #ffffff",
                                        borderRadius: "50%",
                                        zIndex: 10,
                                        cursor: "crosshair",
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="nodrag nowheel" onPointerDown={(e) => e.stopPropagation()} style={{ padding: 10 }}>
                <Visual
                    state={state}
                    setState={setState}
                    inputs={inputs}
                    getTemplate={getTemplate}
                    getInputTemplate={getInputTemplate}
                />
            </div>
        </div>
    );
};
