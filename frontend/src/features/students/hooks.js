import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

// A missing student (404) will not appear by retrying: only retry when the server is unreachable or failing
const retryOnServerTrouble = (failureCount, error) =>
  failureCount < 2 && (error.status === 0 || error.status >= 500);

export const useStudent = (id) =>
  useQuery({
    queryKey: ['students', 'detail', id],
    queryFn: ({ signal }) => api(`/students/${id}`, { signal }).then((response) => response.data),
    enabled: id !== undefined,
    retry: retryOnServerTrouble,
  });

// The class picker of the creation form (the backend caps a page at 100)
export const useClassOptions = (enabled = true) =>
  useQuery({
    queryKey: ['classes', 'options'],
    queryFn: ({ signal }) => api('/classes?limit=100', { signal }).then((response) => response.data),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

export function useStudentMutations() {
  const queryClient = useQueryClient();
  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ['students'] });

  const create = useMutation({
    mutationFn: (body) => api('/students', { method: 'POST', body }),
    onSuccess: refreshAll,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/students/${id}`, { method: 'PATCH', body }),
    onSuccess: refreshAll,
  });

  // Only the lists are refreshed: reloading the deleted student's own page would give a 404
  const remove = useMutation({
    mutationFn: ({ id, confirm }) =>
      api(`/students/${id}${confirm ? '?confirm=true' : ''}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', 'list'] }),
  });

  const createAccount = useMutation({
    mutationFn: ({ id, email }) => api(`/students/${id}/account`, { method: 'POST', body: { email } }),
    onSuccess: refreshAll,
  });

  return { create, update, remove, createAccount };
}