import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// The backend answers { data: [...] } without pages (the 200 most recent evaluations)
// params: { classId, subjectId, term } (empty values are skipped)
export const useEvaluations = (params) =>
  useQuery({
    queryKey: ['evaluations', 'list', params],
    queryFn: ({ signal }) => api(`/evaluations${buildQuery(params)}`, { signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });