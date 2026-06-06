'use client';

import { useGraphStore } from '@/features/graph-builder/store/graph-store';
import { Button } from '@/components/ui/button';
import { Save, Star, Box, Store, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function SocialButtons() {
  const currentEntity = useGraphStore((s) => s.currentEntity());
  const isDirty = useGraphStore((s) => s.currentIsDirty());
  const isSaving = useGraphStore((s) => s.currentIsSaving());
  const saveGraph = useGraphStore((s) => s.saveGraph);
  const updateEntityField = useGraphStore((s) => s.updateEntityField);

  const handleSave = async () => {
    try {
      await saveGraph();
      toast.success('Граф сохранён');
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  const toggle = (field: 'public' | 'featured' | 'store') => async () => {
    if (!currentEntity) return;
    try {
      await updateEntityField(field, !currentEntity[field]);
      toast.success('Обновлено');
    } catch {
      toast.error('Ошибка');
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        variant={isDirty ? 'default' : 'outline'}
        size="icon"
        onClick={handleSave}
        disabled={isSaving || !isDirty}
        title="Сохранить"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      </Button>

      <Button
        variant={currentEntity?.featured ? 'secondary' : 'outline'}
        size="icon"
        onClick={toggle('featured')}
        disabled={isSaving || !currentEntity}
        title="Избранное"
      >
        <Star className="h-4 w-4" />
      </Button>

      <Button
        variant={currentEntity?.public ? 'secondary' : 'outline'}
        size="icon"
        onClick={toggle('public')}
        disabled={isSaving || !currentEntity}
        title={currentEntity?.public ? 'Публичный' : 'Приватный'}
      >
        <Box className="h-4 w-4" />
      </Button>

      <Button
        variant={currentEntity?.store ? 'secondary' : 'outline'}
        size="icon"
        onClick={toggle('store')}
        disabled={isSaving || !currentEntity}
        title="Магазин"
      >
        <Store className="h-4 w-4" />
      </Button>
    </div>
  );
}
