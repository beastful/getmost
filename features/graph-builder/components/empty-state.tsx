"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FolderOpen, MousePointerClick } from "lucide-react";
import { useGraphStore } from "@/features/graph-builder/store/graph-store";
import { toast } from "sonner";

interface EmptyStateProps {
  workspaceId: string;
  children?: ReactNode;
}

export function EmptyState({ workspaceId, children }: EmptyStateProps) {
  const entities = useGraphStore((s) => s.entities);
  const isLoading = useGraphStore((s) => s.isLoading);
  const activeEntityId = useGraphStore((s) => s.activeEntityId);
  const createNewEntity = useGraphStore((s) => s.createNewEntity);
  const openEntity = useGraphStore((s) => s.openEntity);
  const loadEntities = useGraphStore((s) => s.loadEntities);

  const handleCreate = async () => {
    try {
      const entity = await createNewEntity({
        name: "Безымянный граф",
        editor: "graph-editor",
        data: JSON.stringify({ nodes: [], edges: [] }),
        workspaceId,
        public: false,
        featured: false,
        store: false,
        price: 0,
      });
      openEntity(entity);
      toast.success("Граф создан");
      loadEntities({ workspaceId, limit: 10, offset: 0 });
    } catch {
      toast.error("Не удалось создать граф");
    }
  };

  if (isLoading) {
    return <div className="relative h-full w-full">{children}</div>;
  }

  const hasEntities = entities.length > 0;
  const hasActive = !!activeEntityId;

  if (hasActive) {
    return <div className="relative h-full w-full">{children}</div>;
  }

  const isTrulyEmpty = !hasEntities;

  return (
    <div className="relative h-full w-full">
      {/* Фоновый UI — полностью интерактивный */}
      {children}

      {/* Оверлей только визуальный, клики проходят сквозь него */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/20 pointer-events-none">
        {/* Карточка сама перехватывает клики */}
        <Card className="w-full max-w-md border shadow-lg bg-background/95 pointer-events-auto">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              {isTrulyEmpty ? (
                <FolderOpen className="h-6 w-6 text-primary" />
              ) : (
                <MousePointerClick className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-lg font-semibold">
              {isTrulyEmpty ? "Рабочая область пуста" : "Файл не выбран"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isTrulyEmpty
                ? "В рабочей области пока нет графов. Создайте первый файл, чтобы начать работу."
                : "Выберите существующий граф из меню «Файлы» в верхней панели или создайте новый."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 pb-6">
            <Button onClick={handleCreate} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              {isTrulyEmpty ? "Создать первый граф" : "Создать новый граф"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
