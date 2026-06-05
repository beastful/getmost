// features/workspaces/hooks/use-delete-workspace.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteWorkspace } from '@/features/dashboard/api/delete-workspace';
import { readWorkspace } from '@/features/dashboard/api/read-workspace';
import { useAuthStore } from '@/features/auth/store/auth-store';

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ workspaceId, deleteTeam = false }: { workspaceId: string; deleteTeam?: boolean }) => {
      if (!user) throw new Error('You must be logged in');
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
