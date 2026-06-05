import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEntity } from '@/features/project/api/update-entity';

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: any }) =>
      updateEntity(entityId, data),
    onSuccess: (updatedEntity, variables) => {
      queryClient.setQueryData(['entity', variables.entityId], updatedEntity);
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
}
