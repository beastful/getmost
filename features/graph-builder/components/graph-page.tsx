'use client';

import { useEffect, useState } from 'react';
import { useGraphStore } from '@/features/graph-builder/store/graph-store';
import { GraphEditor } from '@/features/graph-builder/components/graph-editor';
import { FileSelector } from '@/features/graph-builder/components/file-selector';
import { ActionButtons } from '@/features/graph-builder/components/action-buttons';
import { UnsavedIndicator } from '@/features/graph-builder/components/unsaved-indicator';
import { useRealtimeSync } from '@/features/graph-builder/hooks/use-realtime-sync';
import { Panel } from '@xyflow/react';
import { NavBar } from '@/features/graph-builder/components/nav-bar';
import { SocialButtons } from '@/features/graph-builder/components/social-buttons';
import { Palette } from '@/features/graph-builder/components/palette';

export default function ProjectPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const currentEntity = useGraphStore((s) => s.currentEntity);

  // Extract workspaceId from URL: ?id=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) setWorkspaceId(id);
  }, []);

  // Realtime sync only when an entity is loaded
  

  if (!workspaceId) return <div className="p-8">Loading workspace...</div>;

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r bg-gray-50">
        <FileSelector workspaceId={workspaceId} />
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-2 border-b bg-white">
          <UnsavedIndicator />
          <ActionButtons />
        </div>
        <div className="flex-1 relative">
          <GraphEditor>
            <Panel position="top-left"><NavBar /></Panel>
            <Panel position="top-right"><SocialButtons /></Panel>
            <Panel position="bottom-center"><Palette /></Panel>
          </GraphEditor>
        </div>
      </main>
    </div>
  );
}
