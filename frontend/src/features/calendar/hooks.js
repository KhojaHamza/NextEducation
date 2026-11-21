import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// from / to: 'yyyy-MM-dd'. The backend answers { data: [{ key, type, title, subtitle, date, endDate }] }
export const useCalendar = (from, to) =>
  useQuery({
    queryKey: ['calendar', from, to],
    queryFn: ({ signal }) => api(`/calendar${buildQuery({ from, to })}`, { signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

export function useEventMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['calendar'] });

  const create = useMutation({
    mutationFn: (body) => api('/school-events', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/school-events/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, remove };
}