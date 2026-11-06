import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export function useUserMutations() {
  const queryClient = useQueryClient();
  // The audit-log filter also reads the users list
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }),
    ]);

  const create = useMutation({
    mutationFn: (body) => api('/users', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/users/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  // Sends a new temporary password back; the user must change it at next login
  const resetPassword = useMutation({
    mutationFn: (id) => api(`/users/${id}/reset-password`, { method: 'POST' }),
    onSuccess: refresh,
  });

  return { create, update, remove, resetPassword };
}