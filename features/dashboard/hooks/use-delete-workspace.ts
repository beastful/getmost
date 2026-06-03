// features/workspaces/hooks/use-delete-workspace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkspace } from '@/features/dashboard/api/delete-workspace';
import { readWorkspace } from '@/features/dashboard/api/read-workspace';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ workspaceId, deleteTeam = false }: { workspaceId: string; deleteTeam?: boolean }) => {
      if (!user) throw new Error('You must be logged in');
      // Optional: verify ownership before deleting
      const workspace = await readWorkspace(workspaceId);
      if (workspace.ownerId !== user.$id) {
        throw new Error('You do not have permission to delete this workspace');
      }
      return deleteWorkspace(workspaceId, deleteTeam);
    },
    onSuccess: (_, variables) => {
      queryClient.removeQueries({ queryKey: ['workspace', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
