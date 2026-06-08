'use client';

import { useGraphStore } from '@/features/graph-builder/store/graph-store';
import { Button } from '@/components/ui/button';
import { Save, Star, Box, Store, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { storage } from '@/lib/appwrite'; // your configured Appwrite storage instance
import { ID } from 'appwrite'; // if using Appwrite SDK
import { useState } from 'react';

const resizeImage = (dataUrl: string, targetWidth: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.height / img.width;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas to blob failed'));
      }, 'image/png', 0.9); // 90% quality, PNG supports transparency
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

export function SocialButtons() {
  const currentEntity = useGraphStore((s) => s.currentEntity());
  const currentDraft = useGraphStore((s) => s.currentDraft());
  const saveGraph = useGraphStore((s) => s.saveGraph);
  const updateEntityField = useGraphStore((s) => s.updateEntityField);

  const isDirty = currentDraft?.isDirty ?? false;
  const isSaving = currentDraft?.isSaving ?? false;
  const [isTakingSnapshot, setIsTakingSnapshot] = useState(false);

  const handleSave = async () => {
    if (!currentEntity) return;
    try {
      await saveGraph();
      toast.success('Граф сохранён');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка сохранения');
    }
  };

  // Helper: convert dataURL to Blob
  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Capture graph, upload to Appwrite, update metadata.preview
  const handleSnapshot = async () => {
    if (!currentEntity) {
      toast.error('Нет активного графа');
      return;
    }

    setIsTakingSnapshot(true);

    try {
      // 1. Capture graph container
      const graphContainer = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!graphContainer) throw new Error('React Flow container not found');

      const dataUrl = await toPng(graphContainer, {
        backgroundColor: '#ffffff',
        pixelRatio: 2, // still captures high quality, then we downsize
      });

      // 2. Resize image to 400px width
      const resizedBlob = await resizeImage(dataUrl, 600);

      // 3. Create File from resized blob
      const fileName = `${currentEntity.id}_preview_${Date.now()}.png`;
      const file = new File([resizedBlob], fileName, { type: 'image/png' });

      // 4. Upload to Appwrite Storage
      const bucketId = '69808c110017eccf36bd';
      const fileId = ID.unique();
      await storage.createFile(bucketId, fileId, file);

      // 5. Build permanent URL (same as before)
      const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
      const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
      const imageUrl = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`;

      // 6. Update metadata as JSON string
      const currentMetadataString = currentEntity.metadata || '{}';
      let metadataObj: Record<string, any> = {};
      try {
        metadataObj = JSON.parse(currentMetadataString);
      } catch (e) {
        console.warn('Invalid existing metadata, resetting to empty object');
      }
      metadataObj.preview = imageUrl;
      const newMetadataString = JSON.stringify(metadataObj);

      if (newMetadataString.length > 2048) {
        toast.error('Метаданные слишком большие (макс. 2048 символов)');
        return;
      }

      await updateEntityField('metadata', newMetadataString);
      toast.success('Снимок сохранён (400px)');
    } catch (error) {
      console.error('Snapshot failed:', error);
      toast.error('Не удалось создать снимок');
    } finally {
      setIsTakingSnapshot(false);
    }
  };

  const toggle = (field: 'public' | 'featured' | 'store') => async () => {
    if (!currentEntity) return;
    try {
      await updateEntityField(field, !currentEntity[field]);
      toast.success('Обновлено');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка обновления');
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

      {/* New Snapshot Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleSnapshot}
        disabled={isTakingSnapshot || !currentEntity}
        title="Сделать снимок графа"
      >
        {isTakingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
