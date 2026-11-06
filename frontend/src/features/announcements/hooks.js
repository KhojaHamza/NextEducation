import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// params: { page, limit } — the backend answers { data, meta }
export const useAnnouncements = (params = {}) =>
  useQuery({
    queryKey: ['announcements', 'list', params],
    queryFn: ({ signal }) => api(`/announcements${buildQuery(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });

export function useAnnouncementMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['announcements'] });

  const create = useMutation({
    mutationFn: (body) => api('/announcements', { method: 'POST', body }),
    onSuccess: refresh,
  });

  return { create };
}