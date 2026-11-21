import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// The backend answers { data: [...] } (200 homeworks at most)
// params: { classId, subjectId, from, to } (empty values are skipped)
export const useHomeworks = (params) =>
  useQuery({
    queryKey: ['homeworks', 'list', params],
    queryFn: ({ signal }) => api(`/homeworks${buildQuery(params)}`, { signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

export function useHomeworkMutations() {
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['homeworks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  };

  const create = useMutation({
    mutationFn: (body) => api('/homeworks', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/homeworks/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/homeworks/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}