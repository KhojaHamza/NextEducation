import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export function useFeeMutations() {
  const queryClient = useQueryClient();
  // Student accounts (balances) depend on the fee items
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['fee-items'] }),
      queryClient.invalidateQueries({ queryKey: ['payments'] }),
    ]);

  const create = useMutation({
    mutationFn: (body) => api('/fee-items', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/fee-items/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/fee-items/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}