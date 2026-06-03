// features/workspaces/hooks/use-workspaces.ts
import { useQuery } from '@tanstack/react-query';
import { listWorkspaces } from '@/features/dashboard/api/list-workspaces';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useState } from 'react';

interface UseWorkspacesOptions {
  limit?: number;
  search?: string;
}

export function useWorkspaces({ limit = 10, search }: UseWorkspacesOptions = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['workspaces', { ownerId: user?.$id, search, page, limit }],
    queryFn: async () => {
      if (!user) throw new Error('You must be logged in to view workspaces');
      return listWorkspaces({
        ownerId: user.$id,
        limit,
        offset: (page - 1) * limit,
        search,
      });
    },
    enabled: !!user,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const goToNextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setPage(p => Math.max(p - 1, 1));
  const goToPage = (newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages)));

  return {
    ...query,
    workspaces: query.data?.workspaces ?? [],
    pagination: {
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      goToNextPage,
      goToPrevPage,
      goToPage,
      total,
    },
  };
}
