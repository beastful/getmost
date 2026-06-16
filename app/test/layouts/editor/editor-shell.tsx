'use client';

import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Handle,
  Position,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ModeToggle } from '@/features/theming/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Copy, LineChart, Plug, Save, Search, Trash } from 'lucide-react';
import { useFlowStore } from './store';
import { createNode, NODES } from './nodes';
import { useEditorRoom } from './hooks/use-editor-room';
import { EntitySidebar } from './entity-sidebar';
import { CurrentEditors } from './current-editors';
import {
  CollaborationProvider,
  TeamGuard,
  VisitorManager,
} from './lobby';

function CustomNode({ data }: { data: any }) {
  const { updateNodeData } = useFlowStore();

  return (
    <div className="min-w-[180px] rounded-lg border bg-background p-3 shadow-sm">
      <div className="mb-2 text-sm font-medium">{data.label}</div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          {(data.inputs ?? []).map((input: any) => (
            <div key={input.id} className="relative rounded bg-muted px-2 py-1 text-xs">
              {input.name}
              <Handle
                id={input.id}
                type="target"
                position={Position.Left}
                style={{
                  left: 0,
                  transform: 'translate(-50%, -50%)',
                  top: '50%',
                  width: 10,
                  height: 10,
                  border: 'none',
                }}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {(data.outputs ?? []).map((output: any) => (
            <div key={output.id} className="relative rounded bg-muted px-2 py-1 text-xs">
              {output.name}
              <Handle
                id={output.id}
                type="source"
                position={Position.Right}
                style={{
                  right: 0,
                  transform: 'translate(50%, -50%)',
                  top: '50%',
                  width: 10,
                  height: 10,
                  border: 'none',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {'value' in (data.state ?? {}) && (
        <input
          className="mt-3 w-full rounded border px-2 py-1 text-sm"
          value={String(data.state.value ?? '')}
          onChange={(e) =>
            updateNodeData(data.id ?? data._id ?? '', {
              state: {
                ...(data.state ?? {}),
                value: e.target.value,
              },
            })
          }
        />
      )}
    </div>
  );
}

function AddBlockMenu() {
  const addNode = useFlowStore((s) => s.addNode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Plug />
          Добавить блок
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="center" className="w-120 p-3">
        <DropdownMenuGroup className="flex flex-col gap-2 h-full">
          <InputGroup>
            <InputGroupInput placeholder="Поиск блоков" />
            <InputGroupAddon align="inline-end">
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <ScrollArea className="lg:h-50 h-[120px]">
            <div className="grid grid-cols-2 gap-4 pb-4">
              {NODES.map((nodeDef) => (
                <button
                  key={nodeDef.id}
                  className="flex items-center gap-4 rounded-md p-2 text-left hover:bg-muted"
                  onClick={() => addNode(createNode(nodeDef.id))}
                >
                  <div className="bg-muted w-12 h-12 min-w-12 flex rounded-md items-center justify-center">
                    <LineChart className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{nodeDef.name}</div>
                    <div className="text-muted-foreground text-xs">{nodeDef.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditorCanvas({ entityId }: { entityId: string }) {
  const { saveNow } = useEditorRoom(entityId);

  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const addEdge = useFlowStore((s) => s.addEdge);

  const onConnect = (connection: Connection) => {
    addEdge({ ...connection, id: crypto.randomUUID() } as Edge);
  };

  return (
    <ReactFlow
      nodeTypes={{ customNode: CustomNode }}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />

      <Panel position="top-left">
        <div className="flex gap-2">
          <VisitorManager />
        </div>
      </Panel>

      <Panel position="top-center">
        <ButtonGroup>
          <Button variant="outline">
            <Trash />
          </Button>
          <Button variant="outline">
            <Copy />
          </Button>
        </ButtonGroup>
      </Panel>

      <Panel position="top-right">
        <div className="flex items-center gap-2">
          <CurrentEditors />
          <ModeToggle />
          <Button variant="outline" onClick={() => saveNow()}>
            <Save />
          </Button>
        </div>
      </Panel>

      <Panel position="bottom-center">
        <AddBlockMenu />
      </Panel>
    </ReactFlow>
  );
}

export function EditorShell({ workspaceId }: { workspaceId: string }) {
  const [entityId, setEntityId] = useState<string | null>(null);

  return (
    <CollaborationProvider>
      <TeamGuard>
        <div className="flex h-screen">
          <EntitySidebar
            workspaceId={workspaceId}
            selectedEntityId={entityId}
            onSelect={setEntityId}
          />

          <div className="flex-1">
            {entityId ? (
              <EditorCanvas entityId={entityId} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select an entity to open its room
              </div>
            )}
          </div>
        </div>
      </TeamGuard>
    </CollaborationProvider>
  );
}
