// features/workspaces/hooks/use-workspace.ts
import { useQuery } from '@tanstack/react-query';
import { readWorkspace } from '@/features/dashboard/api/read-workspace';
import { useAuthStore } from '@/features/auth/store/auth-store';

export function useWorkspace(workspaceId: string | null) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      if (!user) throw new Error('You must be logged in');
      const workspace = await readWorkspace(workspaceId!);
      // if (workspace.ownerId !== user.$id) {
      //   throw new Error('Access denied');
      // }
      return workspace;
    },
    enabled: !!workspaceId && !!user,
  });
}
