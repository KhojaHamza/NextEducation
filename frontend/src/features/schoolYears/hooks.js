import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export function useSchoolYearMutations() {
  const queryClient = useQueryClient();
  // The year pickers, the class forms and the dashboard all depend on the years
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['school-years'] }),
      queryClient.invalidateQueries({ queryKey: ['classes'] }),
      queryClient.invalidateQueries({ queryKey: ['count'] }),
    ]);

  const create = useMutation({
    mutationFn: (body) => api('/school-years', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/school-years/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/school-years/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}