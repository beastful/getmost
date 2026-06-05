import { useQuery } from '@tanstack/react-query';
import { listEntities } from '@/features/project/api/list-entities';
import { useState } from 'react';

interface UseEntitiesOptions {
  workspaceId?: string;
  public?: boolean;
  featured?: boolean;
  store?: boolean;
  search?: string;
  limit?: number;
}

export function useEntities({
  workspaceId,
  public: isPublic,
  featured,
  store,
  search,
  limit = 10,
}: UseEntitiesOptions = {}) {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['entities', { workspaceId, isPublic, featured, store, search, page, limit }],
    queryFn: () =>
      listEntities({
        workspaceId,
        public: isPublic,
        featured,
        store,
        search,
        limit,
        offset: (page - 1) * limit,
      }),
    enabled: !!workspaceId,
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const goToNextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setPage(p => Math.max(p - 1, 1));
  const goToPage = (newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages)));

  return {
    ...query,
    entities: query.data?.entities ?? [],
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
