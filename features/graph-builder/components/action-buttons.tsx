// features/graph-editor/components/ActionButtons.tsx
'use client';

import { useGraphStore } from '../store/graph-store';
import { Button } from '@/components/ui/button';
import { Save, Globe, Star, Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ActionButtons() {
  const currentEntity = useGraphStore((s) => s.currentEntity());
  const isDirty = useGraphStore((s) => s.currentIsDirty());
  const isSaving = useGraphStore((s) => s.currentIsSaving());
  const saveGraph = useGraphStore((s) => s.saveGraph);
  const updateEntityField = useGraphStore((s) => s.updateEntityField);

  if (!currentEntity) return null;

  const handleSave = async () => {
    try {
      await saveGraph();
      toast.success('Граф сохранён');
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  const toggle = (field: 'public' | 'featured' | 'store') => async () => {
    try {
      await updateEntityField(field, !currentEntity[field]);
      toast.success('Обновлено');
    } catch {
      toast.error('Ошибка');
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant={isDirty ? 'default' : 'outline'} size="sm" onClick={handleSave} disabled={isSaving || !isDirty}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span className="ml-2">Сохранить</span>
      </Button>
      <Button variant={currentEntity.public ? 'secondary' : 'outline'} size="sm" onClick={toggle('public')} disabled={isSaving}>
        <Globe className="h-4 w-4" />
        <span className="ml-2">{currentEntity.public ? 'Публичный' : 'Приватный'}</span>
      </Button>
      <Button variant={currentEntity.featured ? 'secondary' : 'outline'} size="sm" onClick={toggle('featured')} disabled={isSaving}>
        <Star className="h-4 w-4" />
        <span className="ml-2">Избранное</span>
      </Button>
      <Button variant={currentEntity.store ? 'secondary' : 'outline'} size="sm" onClick={toggle('store')} disabled={isSaving}>
        <Store className="h-4 w-4" />
        <span className="ml-2">Магазин</span>
      </Button>
    </div>
  );
}
