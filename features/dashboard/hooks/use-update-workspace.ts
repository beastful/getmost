// features/workspaces/hooks/use-update-workspace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { readWorkspace } from '@/features/dashboard/api/read-workspace';
import { updateWorkspace } from '@/features/dashboard/api/update-workspace';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workspaceId, data }: { workspaceId: string; data: any }) => {
      if (!user) throw new Error('You must be logged in');
      const workspace = await readWorkspace(workspaceId);
      if (workspace.ownerId !== user.$id) {
        throw new Error('You do not have permission to update this workspace');
      }
      return updateWorkspace(workspaceId, data);
    },
    onSuccess: (updatedWorkspace, variables) => {
      queryClient.setQueryData(['workspace', variables.workspaceId], updatedWorkspace);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
