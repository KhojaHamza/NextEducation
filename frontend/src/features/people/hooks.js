import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export function usePeopleMutations(resource) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: [resource] });

  const create = useMutation({
    mutationFn: (body) => api(`/${resource}`, { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/${resource}/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/${resource}/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}