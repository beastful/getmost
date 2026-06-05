import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEntity } from '@/features/project/api/delete-entity';

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEntity,
    onSuccess: (_, entityId) => {
      queryClient.removeQueries({ queryKey: ['entity', entityId] });
      queryClient.invalidateQueries({ queryKey: ['entities'] });
    },
  });
}
