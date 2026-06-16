'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import {
  closeEntityRoom,
  openEntityRoom,
  saveEntityRoomNow,
  setCollaborationIdentity,
} from '../appwrite-sync';

export function useEditorRoom(entityId: string | null) {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.$id || !user.email) return;

    setCollaborationIdentity({
      userId: user.$id,
      sessionId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `session-${Date.now()}`,
      email: user.email,
      name: user.name?.trim() || user.email.split('@')[0] || 'User',
    });
  }, [user?.$id, user?.email, user?.name]);

  useEffect(() => {
    if (!entityId) return;

    openEntityRoom(entityId);

    return () => {
      closeEntityRoom({ save: true });
    };
  }, [entityId]);

  return {
    saveNow: () => saveEntityRoomNow(),
  };
}