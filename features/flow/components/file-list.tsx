'use client';

import * as React from 'react';
import { File, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useRoom } from '@/features/flow/contexts/room-context';
import { useWorkspaceId } from '@/features/flow/hooks/use-workspace-id';
import { useEntities } from '@/features/project/hooks/use-entities';
import { useCreateEntity } from '@/features/project/hooks/use-create-entity';

type MetadataSyncMode = 'db' | 'yjs';

type EntityMetadata = {
  sync?: MetadataSyncMode;
};

function safeParseMetadata(metadata: string): EntityMetadata {
  try {
    const parsed = JSON.parse(metadata || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as EntityMetadata;
  } catch {
    return {};
  }
}

function stringifyMetadata(metadata: EntityMetadata): string {
  return JSON.stringify(metadata);
}

export function FileList() {
  const workspaceId = useWorkspaceId();
  const { roomId, setRoomId, setIsConnected } = useRoom();

  const { entities = [], isLoading } = useEntities({
    workspaceId: workspaceId ?? '',
    limit: 100,
  });

  const createEntityMutation = useCreateEntity();

  const selectedEntity =
    entities.find((entity) => entity.$id === roomId) ?? null;

  const handleSelect = React.useCallback(
    (entityId: string) => {
      if (entityId === roomId) return;
      setIsConnected(false);
      setRoomId(entityId);
    },
    [roomId, setIsConnected, setRoomId]
  );

  const handleCreate = React.useCallback(async () => {
    if (!workspaceId || createEntityMutation.isPending) return;

    const createdEntity = await createEntityMutation.mutateAsync({
      name: `Untitled ${entities.length + 1}`,
      editor: 'flow',
      data: JSON.stringify({ nodes: [], edges: [] }),
      workspaceId,
      description: '',
      folders: [],
      metadata: stringifyMetadata({ sync: 'db' }),
      public: false,
      featured: false,
      store: false,
      price: 0,
    });

    setIsConnected(false);
    setRoomId(createdEntity.$id);
  }, [
    createEntityMutation,
    entities.length,
    setIsConnected,
    setRoomId,
    workspaceId,
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" type="button">
          <File className="size-4" />
          {selectedEntity?.name ?? 'Файлы'}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel>Файлы</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={handleCreate}
            disabled={!workspaceId || createEntityMutation.isPending}
          >
            <Plus className="mr-2 size-4" />
            {createEntityMutation.isPending ? 'Создание...' : 'Создать файл'}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {isLoading ? (
            <DropdownMenuItem disabled>Загрузка...</DropdownMenuItem>
          ) : entities.length === 0 ? (
            <DropdownMenuItem disabled>Нет файлов</DropdownMenuItem>
          ) : (
            entities.map((entity) => {
              const active = entity.$id === roomId;
              const sync = safeParseMetadata(entity.metadata).sync ?? 'db';

              return (
                <DropdownMenuItem
                  key={entity.$id}
                  onClick={() => handleSelect(entity.$id)}
                >
                  <span className="truncate">{entity.name}</span>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {sync}
                    </span>
                    {active ? (
                      <span className="text-xs text-muted-foreground">
                        Active
                      </span>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
