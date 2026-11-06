import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

// Classes of the logged-in teacher, each with the subjects they may grade
export const useMyClasses = (enabled = true) =>
  useQuery({
    queryKey: ['my-classes'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) => api('/teaching-assignments/mine', { signal }).then((r) => r.data),
  });

// The grade sheet is edited on screen: it must never be refreshed behind the person's back
// (no cache between visits, no refetch on window focus), otherwise typed grades would be lost
export const useGradeSheet = (id) =>
  useQuery({
    queryKey: ['evaluations', 'sheet', id],
    queryFn: ({ signal }) => api(`/evaluations/${id}/grades`, { signal }),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => failureCount < 2 && (error.status === 0 || error.status >= 500),
  });

export function useEvaluationMutations() {
  const queryClient = useQueryClient();
  // Only the lists: refreshing the open grade sheet would erase what is being typed
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['evaluations', 'list'] });

  const create = useMutation({
    mutationFn: (body) => api('/evaluations', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/evaluations/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: ({ id, confirm }) =>
      api(`/evaluations/${id}${confirm ? '?confirm=true' : ''}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  // Replaces only the grades sent (score null removes a grade)
  const saveGrades = useMutation({
    mutationFn: ({ id, grades }) => api(`/evaluations/${id}/grades`, { method: 'PUT', body: { grades } }),
  });

  return { create, update, remove, saveGrades };
}