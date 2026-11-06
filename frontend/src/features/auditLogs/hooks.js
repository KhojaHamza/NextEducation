import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// params: { page, limit, userId?, action?, entity?, entityId?, dateFrom?, dateTo? }
export const useAuditLogs = (params) =>
  useQuery({
    queryKey: ['audit-logs', 'list', params],
    queryFn: ({ signal }) => api(`/audit-logs${buildQuery(params)}`, { signal }),
    placeholderData: keepPreviousData,
  });

// Feeds the "user" filter (the backend caps a page at 100)
export const useUsersOptions = () =>
  useQuery({
    queryKey: ['users', 'options'],
    queryFn: ({ signal }) => api('/users?limit=100', { signal }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });