import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

// The backend answers { data: [...] } without pages (500 rows maximum)
export const useAssignments = (classId) =>
  useQuery({
    queryKey: ['assignments', classId],
    enabled: Boolean(classId),
    queryFn: ({ signal }) => api(`/teaching-assignments?classId=${classId}`, { signal }).then((r) => r.data),
  });

export function useAssignmentMutations() {
  const queryClient = useQueryClient();
  // Teachers and classes cannot be deleted while assigned: no stale cache for them, only the assignments
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['assignments'] });

  const create = useMutation({
    mutationFn: (body) => api('/teaching-assignments', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/teaching-assignments/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, remove };
}