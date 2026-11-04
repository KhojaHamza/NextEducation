import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export const teacherName = (teacher) =>
  teacher.user ? `${teacher.user.lastName} ${teacher.user.firstName}` : `Enseignant ${teacher.id}`;

// Options of the pickers (the backend caps a page at 100)
export const useSchoolYears = () =>
  useQuery({
    queryKey: ['school-years', 'options'],
    queryFn: ({ signal }) => api('/school-years?limit=100', { signal }).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });

export const useTeacherOptions = () =>
  useQuery({
    queryKey: ['teachers', 'options'],
    queryFn: ({ signal }) => api('/teachers?limit=100', { signal }).then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });

export function useClassMutations() {
  const queryClient = useQueryClient();
  // The students list shows class names too
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['classes'] }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
    ]);

  const create = useMutation({
    mutationFn: (body) => api('/classes', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/classes/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/classes/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}