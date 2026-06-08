"use client";

import React, {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Handle,
  Position,
  useStore,
  type NodeProps,
} from "@xyflow/react";
import {
  getNode,
  evaluateOutputs,
  renderUiAst,
  resolveIcon,
} from "./BJLR";

export interface NodeUpdatePayload {
  templates?: Record<string, any>;
  state?: Record<string, any>;
}

export const NodeUpdateContext = React.createContext<
  (nodeId: string, patch: NodeUpdatePayload) => void
>(() => {});

export const FlowNode = ({ id, data, selected }: NodeProps) => {
  const nodeDef = getNode(data.nodeType);
  const updateNodeData = useContext(NodeUpdateContext);

  if (!nodeDef) return null;

  const [state, setLocalState] = useState(() => ({
    ...nodeDef.state,
    ...(data.state || {}),
  }));

  const rawInputs = useStore((store: any) => {
    const result: Record<string, any> = {};
    const edges = store.edges || [];

    for (const input of nodeDef.inputs) {
      const edge = edges.find(
        (e: any) => e.target === id && e.targetHandle === input.id
      );

      if (edge) {
        const src = store.nodeLookup?.get?.(edge.source);
        result[input.id] = src?.data?.templates?.[edge.sourceHandle];
      }
    }

    return result;
  });

  const inputs = useMemo(() => rawInputs, [JSON.stringify(rawInputs)]);

  const setState = useCallback((key: string, val: any) => {
    setLocalState((prev) => ({ ...prev, [key]: val }));
  }, []);

  const templates = useMemo(() => {
    return evaluateOutputs(nodeDef, {
      state,
      inputs,
      templates: {},
    });
  }, [nodeDef, state, inputs]);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }

    if (
      JSON.stringify(data.templates) === JSON.stringify(templates) &&
      JSON.stringify(data.state) === JSON.stringify(state)
    ) {
      return;
    }

    updateNodeData(id, { templates, state });
  }, [templates, state, id, updateNodeData, data.templates, data.state]);

  const Icon = resolveIcon(nodeDef.icon);

  const runtimeCtx = useMemo(
    () => ({
      state,
      inputs,
      templates,
      setState,
    }),
    [state, inputs, templates, setState]
  );

  const body = nodeDef.ui ? (
    <div className="nodrag nowheel" onPointerDown={(e) => e.stopPropagation()}>
      {renderUiAst(nodeDef.ui, runtimeCtx)}
    </div>
  ) : (
    <div className="text-xs text-slate-500">No UI</div>
  );

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
            }}
          />
        ))}

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
            }}
          />
        ))}

        {body}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col rounded-xl border-2 bg-white shadow-sm transition-all ${
        selected ? "border-indigo-400 shadow-md" : "border-slate-200"
      }`}
      style={{ width: nodeDef.width || 260 }}
    >
      <div className="flex h-10 items-center justify-between border-b-2 border-slate-100 px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center text-slate-500">
            <Icon size={16} />
          </div>
          <span className="text-sm font-semibold text-slate-700">{nodeDef.name}</span>
        </div>
      </div>

      {(nodeDef.inputs.length > 0 || nodeDef.outputs.length > 0) && (
        <div className="relative flex justify-between gap-2 border-b border-slate-100 px-3 py-2.5 shrink-0">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            {nodeDef.inputs.map((input) => (
              <div key={input.id} className="relative flex h-5 items-center">
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
                  }}
                />
                <div className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                  {input.name}
                </div>
              </div>
            ))}
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1.5">
            {nodeDef.outputs.map((output) => (
              <div key={output.id} className="relative flex h-5 items-center justify-end">
                <div className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
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
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="nodrag nowheel p-2.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  );
};
