import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// The backend has no statistics route: we ask each list for one row and read meta.total
export const useCount = (resource, params = {}, enabled = true) =>
  useQuery({
    queryKey: ['count', resource, params],
    enabled,
    staleTime: 0, // always fresh when the dashboard opens
    queryFn: ({ signal }) =>
      api(`/${resource}${buildQuery({ limit: 1, ...params })}`, { signal }).then((r) => r.meta?.total ?? 0),
  });