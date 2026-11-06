import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

// Subjects of one level (a class only accepts the subjects of its own level)
export const useSubjectsOfLevel = (level) =>
  useQuery({
    queryKey: ['subjects', 'of-level', level],
    enabled: Boolean(level),
    queryFn: ({ signal }) =>
      api(`/subjects?limit=100&level=${encodeURIComponent(level)}`, { signal }).then((r) => r.data),
  });

export function useSubjectMutations() {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subjects'] }),
      queryClient.invalidateQueries({ queryKey: ['assignments'] }),
    ]);

  const create = useMutation({
    mutationFn: (body) => api('/subjects', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/subjects/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/subjects/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}