// features/graph-editor/components/FileSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '../store/graph-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, PenSquare, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Entity } from '../types/types';

interface FileSelectorProps {
  workspaceId: string;
}

export function FileSelector({ workspaceId }: FileSelectorProps) {
  const [search, setSearch] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const entities = useGraphStore((s) => s.entities);
  const total = useGraphStore((s) => s.total);
  const isLoading = useGraphStore((s) => s.isLoading);
  const loadEntities = useGraphStore((s) => s.loadEntities);
  const openEntity = useGraphStore((s) => s.openEntity);
  const switchEntity = useGraphStore((s) => s.switchEntity);
  const activeEntityId = useGraphStore((s) => s.activeEntityId);
  const drafts = useGraphStore((s) => s.drafts);
  const createNewEntity = useGraphStore((s) => s.createNewEntity);
  const renameEntity = useGraphStore((s) => s.renameEntity);
  const deleteEntity = useGraphStore((s) => s.deleteEntity);

  useEffect(() => {
    loadEntities({
      workspaceId,
      search: search || undefined,
      limit,
      offset: (page - 1) * limit,
    });
  }, [workspaceId, search, page, loadEntities]);

  const totalPages = Math.ceil(total / limit) || 1;

  const handleSelect = (entity: Entity) => {
    if (activeEntityId === entity.$id) return;
    // Если у текущего есть несохранённые изменения — показываем индикатор
    // но всё равно переключаемся (черновик остаётся в памяти)
    switchEntity(entity.$id);
  };

  const handleRename = async (id: string) => {
    if (!newName.trim()) return;
    try {
      await renameEntity(id, newName);
      setRenamingId(null);
      toast.success('Переименовано');
    } catch {
      toast.error('Ошибка переименования');
    }
  };

  const handleCreateNew = async () => {
    try {
      const newEntity = await createNewEntity({
        name: 'Безымянный граф',
        editor: 'graph-editor',
        data: JSON.stringify({ nodes: [], edges: [] }),
        workspaceId,
        public: false,
        featured: false,
        store: false,
        price: 0,
      });
      openEntity(newEntity);
      toast.success('Граф создан');
    } catch {
      toast.error('Ошибка создания');
    }
  };

  return (
    <Card className="p-4 w-80 h-full flex flex-col">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Поиск файлов..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Button size="icon" variant="outline" onClick={handleCreateNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading && <div className="text-sm text-gray-500">Загрузка...</div>}
        {entities.map((entity) => {
          const draft = drafts[entity.$id];
          const hasUnsaved = draft?.isDirty ?? false;
          const isActive = activeEntityId === entity.$id;

          return (
            <div
              key={entity.$id}
              className={`flex items-center justify-between p-2 rounded-md hover:bg-gray-100 cursor-pointer group ${
                isActive ? 'bg-blue-50 border border-blue-200' : ''
              }`}
            >
              {renamingId === entity.$id ? (
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={() => handleRename(entity.$id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(entity.$id)}
                  autoFocus
                  className="flex-1 mr-2"
                />
              ) : (
                <div className="flex-1 truncate" onClick={() => handleSelect(entity)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entity.name}</span>
                    {hasUnsaved && <AlertCircle className="h-3 w-3 text-amber-500" />}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(entity.$updatedAt).toLocaleDateString()}
                    {hasUnsaved && ' • несохранено'}
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setRenamingId(entity.$id); setNewName(entity.name); }}
                className="opacity-0 group-hover:opacity-100"
              >
                <PenSquare className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-4 pt-2 border-t">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">Стр. {page} из {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}