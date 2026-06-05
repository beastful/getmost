// features/workspaces/hooks/use-create-workspace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWorkspace } from '@/features/dashboard/api/create-workspace';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { CreateWorkspaceData } from '../types/types';

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (data: Omit<CreateWorkspaceData, 'ownerId'>) => {
      if (!user) throw new Error('You must be logged in to create a workspace');
      return createWorkspace({ ...data, ownerId: user.$id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
