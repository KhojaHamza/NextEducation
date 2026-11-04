import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client.js';

// { page: 1, search: '' } -> "?page=1" (empty values are skipped)
export const buildQuery = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  });
  const text = query.toString();
  return text ? `?${text}` : '';
};

// The backend answers { status, data: [...], meta: { page, limit, total, totalPages } }
export function usePagedList(resource, params) {
  return useQuery({
    queryKey: [resource, 'list', params],
    queryFn: ({ signal }) => api(`/${resource}${buildQuery(params)}`, { signal }),
    // While the next page loads, keep showing the previous one instead of flashing a loader
    placeholderData: keepPreviousData,
  });
}