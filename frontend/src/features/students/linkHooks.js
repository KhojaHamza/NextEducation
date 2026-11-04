import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

// Classes of one school year (the backend caps a page at 100)
export const useClassesOfYear = (yearId) =>
  useQuery({
    queryKey: ['classes', 'of-year', yearId],
    enabled: Boolean(yearId),
    queryFn: ({ signal }) => api(`/classes?limit=100&schoolYearId=${yearId}`, { signal }).then((r) => r.data),
  });

export function useStudentLinks() {
  const queryClient = useQueryClient();

  // The student sheet and the students list both show classes and parents
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ predicate: (q) => ['students', 'student'].includes(q.queryKey[0]) }),
      queryClient.invalidateQueries({ queryKey: ['count'] }),
    ]);

  const enroll = useMutation({
    mutationFn: (body) => api('/enrollments', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const transfer = useMutation({
    mutationFn: ({ id, classId }) => api(`/enrollments/${id}`, { method: 'PATCH', body: { classId } }),
    onSuccess: refresh,
  });

  const unenroll = useMutation({
    mutationFn: (id) => api(`/enrollments/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  // Replaces the whole list of parents of the student
  const setParents = useMutation({
    mutationFn: ({ id, parents }) => api(`/students/${id}/parents`, { method: 'PUT', body: { parents } }),
    onSuccess: refresh,
  });

  return { enroll, transfer, unenroll, setParents };
}