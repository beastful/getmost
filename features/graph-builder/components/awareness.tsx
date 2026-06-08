'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useGraphStore, useCurrentDraft, useAwarenessUsers } from '../store/graph-store';
import type { UserAwareness } from '../store/graph-store';

import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

function MiniUserAvatar({ user }: { user: UserAwareness }) {
  return (
    <div
      className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium text-white ring-2 ring-white shadow-sm"
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {user.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function RemoteCursor({ user, screenPos }: { user: UserAwareness; screenPos: { x: number; y: number } }) {
  if (!screenPos || screenPos.x < -2000) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: screenPos.x,
        top: screenPos.y,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
          fill={user.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: '24px',
          top: '6px',
          backgroundColor: user.color,
          color: 'white',
          padding: '3px 9px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        {user.name}
      </div>
    </div>
  );
}

export function CollaborationBar() {
  const users = useAwarenessUsers();
  const currentUser = useGraphStore(s => s.currentUser);
  const setCurrentUser = useGraphStore(s => s.setCurrentUser);
  const draft = useCurrentDraft();
  const activeEntityId = useGraphStore(s => s.activeEntityId);
  const enableCollaboration = useGraphStore(s => s.enableCollaboration);
  const disableCollaboration = useGraphStore(s => s.disableCollaboration);

  const isCollaborative = draft?.isCollaborative ?? false;
  const [isToggling, setIsToggling] = useState(false);

  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const updateCursorPosition = useGraphStore((s) => s.updateCursorPosition);

  // Cursor handling (minimal but effective)
  useEffect(() => {
    if (!isCollaborative) return;

    const handleMouseMove = (e: MouseEvent) => {
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY }, { snapToGrid: false });
      updateCursorPosition(flowPos);
    };

    window.addEventListener('pointermove', handleMouseMove);
    return () => window.removeEventListener('pointermove', handleMouseMove);
  }, [isCollaborative, screenToFlowPosition, updateCursorPosition]);

  const handleToggle = useCallback(async () => {
    if (!activeEntityId || isToggling) return;
    setIsToggling(true);
    try {
      if (isCollaborative) disableCollaboration(activeEntityId);
      else enableCollaboration(activeEntityId);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setIsToggling(false), 500);
    }
  }, [activeEntityId, isCollaborative, enableCollaboration, disableCollaboration, isToggling]);

  useEffect(() => {
    // Add/remove a class on the body or the flow wrapper
    if (isCollaborative) {
      document.body.classList.add('hide-native-cursor');
    } else {
      document.body.classList.remove('hide-native-cursor');
    }
    return () => {
      document.body.classList.remove('hide-native-cursor');
    };
  }, [isCollaborative]);

  if (!activeEntityId) return null;



  return (
    <>
      {/* Collaboration Bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border shadow-sm rounded-full px-3 py-1 flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Users className="w-4 h-4" />

        </div>

        <div className="flex -space-x-2">
          <MiniUserAvatar user={currentUser} />
          {users
            .filter(u => u.name !== currentUser.name)
            .slice(0, 5)
            .map((user, i) => (
              <MiniUserAvatar key={i} user={user} />
            ))}
        </div>

        {users.length > 6 && (
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            +{users.length - 6}
          </Badge>
        )}

        <Switch
          checked={isCollaborative}
          onCheckedChange={handleToggle}
          disabled={isToggling}
        />
      </div>

      {/* Cursor Overlay */}
      {isCollaborative &&
        users
          .filter((u) => u.cursor && u.cursor.x > -5000)
          .map((user, idx) => {
            const screenPos = flowToScreenPosition(user.cursor!);
            return <RemoteCursor key={idx} user={user} screenPos={screenPos} />;
          })}
    </>
  );
}

export default CollaborationBar;
