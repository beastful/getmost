import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEntity } from '@/features/project/api/create-entity';
import type { CreateEntityData } from '@/features/project/types/types';

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEntityData) => createEntity(data),
    onSuccess: (_, variables) => { 
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      queryClient.invalidateQueries({ queryKey: ['entities', { workspaceId: variables.workspaceId }] });
    },
  });
}
