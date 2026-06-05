// features/graph-editor/components/UnsavedIndicator.tsx
'use client';

import { useGraphStore } from '../store/graph-store';
import { CircleAlert } from 'lucide-react';

export function UnsavedIndicator() {
  const isDirty = useGraphStore((s) => s.isDirty);
  if (!isDirty) return null;
  return (
    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm">
      <CircleAlert className="h-4 w-4" />
      <span>Unsaved changes</span>
    </div>
  );
}
