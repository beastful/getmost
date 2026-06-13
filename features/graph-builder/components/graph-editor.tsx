'use client';

import React, { useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Panel, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow, useStore, type Node, type OnNodesChange, type OnEdgesChange, type OnConnect } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Copy, Trash2, ClipboardPaste } from 'lucide-react';
import { useGraphStore, useCurrentNodes, useCurrentEdges } from '../store/graph-store';
import { FlowNode } from './node';
import { NodeUpdateContext, type NodeUpdatePayload } from './node';
import { NODES } from '../lib/data/nodes';
import CollaborationAwareness, { CursorOverlay } from './awareness';
import throttle from 'lodash/throttle';  // 👈 1. import throttle

export interface GraphActions { addNodeAtCenter: (nodeType: string) => void; deleteSelected: () => void; copySelected: () => void; paste: () => void; }
export const GraphActionsContext = React.createContext<GraphActions>({ addNodeAtCenter: () => { }, deleteSelected: () => { }, copySelected: () => { }, paste: () => { } });

const MemoizedFlowNode = memo(FlowNode, (prev, next) => prev.selected === next.selected && prev.data === next.data && JSON.stringify(prev.data) === JSON.stringify(next.data));

function GraphEditorInner({ children }: { children?: React.ReactNode }) {
  const nodes = useCurrentNodes();
  const edges = useCurrentEdges();
  const setNodes = useGraphStore(s => s.setNodes);
  const setEdges = useGraphStore(s => s.setEdges);
  const activeEntityId = useGraphStore(s => s.activeEntityId);
  const { screenToFlowPosition } = useReactFlow();
  const hasSelection = useStore(useCallback(s => s.nodes.some(n => n.selected) || s.edges.some(e => e.selected), []));
  const clipboardRef = useRef<{ nodes: Node[]; offset: number }>({ nodes: [], offset: 0 });

  // 👇 2. Create throttled version of setNodes (50ms, trailing ensures final position after drag)
  const throttledSetNodes = useMemo(
    () => throttle((updatedNodes: Node[]) => setNodes(updatedNodes), 90, { trailing: true, leading: true }),
    [setNodes]
  );

  useEffect(() => { clipboardRef.current = { nodes: [], offset: 0 }; }, [activeEntityId]);

  const addNodeAtCenter = useCallback((nodeType: string) => {
    const def = NODES.find(n => n.name === nodeType);
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const newNode: Node = { id: `${nodeType}_${Date.now()}`, type: 'flowNode', position: { x: center.x - (def?.width ? def.width / 2 : 130), y: center.y - 40 }, data: { nodeType, templates: {}, state: { ...(def?.defaultState || {}) } }, selected: true };
    setNodes([...nodes.map(n => ({ ...n, selected: false })), newNode]);
  }, [nodes, setNodes, screenToFlowPosition]);

  const deleteSelected = useCallback(() => {
    const removedNodeIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
    setNodes(nodes.filter(n => !n.selected));
    setEdges(edges.filter(e => !e.selected && !removedNodeIds.has(e.source) && !removedNodeIds.has(e.target)));
  }, [nodes, edges, setNodes, setEdges]);

  const copySelected = useCallback(() => {
    const toCopy = nodes.filter(n => n.selected);
    if (toCopy.length) clipboardRef.current = { nodes: toCopy.map(n => JSON.parse(JSON.stringify(n))), offset: 0 };
  }, [nodes]);

  const paste = useCallback(() => {
    const { nodes: copied } = clipboardRef.current;
    if (!copied.length) return;
    clipboardRef.current.offset += 40;
    const offset = clipboardRef.current.offset;
    const newNodes = copied.map(n => ({ ...n, id: `${n.id}_paste_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, position: { x: n.position.x + offset, y: n.position.y + offset }, selected: true }));
    setNodes([...nodes.map(n => ({ ...n, selected: false })), ...newNodes]);
  }, [nodes, setNodes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) { e.preventDefault(); deleteSelected(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !typing) { e.preventDefault(); copySelected(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !typing) { e.preventDefault(); paste(); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected, copySelected, paste]);

  // 👇 3. Use throttledSetNodes in onNodesChange
  const onNodesChange: OnNodesChange = useCallback(changes => {
    const newNodes = applyNodeChanges(changes, nodes);
    throttledSetNodes(newNodes);
  }, [nodes, throttledSetNodes]);

  const onEdgesChange: OnEdgesChange = useCallback(changes => setEdges(applyEdgeChanges(changes, edges)), [edges, setEdges]);
  const onConnect: OnConnect = useCallback(params => setEdges(addEdge({ ...params, animated: true }, edges)), [edges, setEdges]);
  const updateNodeData = useCallback((nodeId: string, patch: NodeUpdatePayload) => setNodes(nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)), [nodes, setNodes]);

  // 👇 4. Cancel throttle on unmount to avoid memory leaks
  useEffect(() => {
    return () => throttledSetNodes.cancel();
  }, [throttledSetNodes]);

  return (
    <NodeUpdateContext.Provider value={updateNodeData}>
      <GraphActionsContext.Provider value={{ addNodeAtCenter, deleteSelected, copySelected, paste }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={{ flowNode: MemoizedFlowNode }}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          snapGrid={[20, 20]}
          snapToGrid={true}
          onlyRenderVisibleElements={true} elevateEdgesOnSelect={false} proOptions={{ hideAttribution: true }}>
          {children}
          {/* <CursorOverlay /> */}

          <Background gap={20} size={1} />
          <Panel position='top-center'></Panel>
          {hasSelection && <Panel position="bottom-center" style={{ marginBottom: 80 }}><div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border rounded-full shadow-lg px-4 py-2"><button onClick={copySelected} className="p-2 hover:bg-accent rounded-full transition-colors" title="Copy"><Copy size={18} /></button><button onClick={paste} className="p-2 hover:bg-accent rounded-full transition-colors" title="Paste"><ClipboardPaste size={18} /></button><div className="w-px h-5 bg-border mx-1" /><button onClick={deleteSelected} className="p-2 hover:bg-destructive/10 text-destructive rounded-full transition-colors" title="Delete"><Trash2 size={18} /></button></div></Panel>}
        </ReactFlow>
      </GraphActionsContext.Provider>
    </NodeUpdateContext.Provider>
  );
}

export function GraphEditor({ children }: { children?: React.ReactNode }) {
  return <div style={{ width: '100%', height: '100%' }}><ReactFlowProvider><GraphEditorInner>{children}</GraphEditorInner></ReactFlowProvider></div>;
}
