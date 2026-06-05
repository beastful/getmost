import { useQuery } from '@tanstack/react-query';
import { readEntity } from '@/features/project/api/read-entity';

export function useEntity(entityId: string | null) {
  return useQuery({
    queryKey: ['entity', entityId],
    queryFn: () => readEntity(entityId!),
    enabled: !!entityId,
  });
}
