'use client';

import { useEntities } from '@/features/project/hooks/use-entities';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type Props = {
  workspaceId: string;
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
};

export function EntitySidebar({ workspaceId, selectedEntityId, onSelect }: Props) {
  const { entities, isLoading } = useEntities({ workspaceId, limit: 50 });

  return (
    <div className="w-[280px] border-r bg-background">
      <div className="border-b px-4 py-3 text-sm font-semibold">Files</div>

      <ScrollArea className="h-[calc(100vh-57px)]">
        <div className="flex flex-col gap-2 p-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading entities...</div>
          ) : (
            entities.map((entity) => (
              <Button
                key={entity.$id}
                variant={selectedEntityId === entity.$id ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => onSelect(entity.$id)}
              >
                {entity.name}
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
