import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

const retryOnServerTrouble = (failureCount, error) =>
  failureCount < 2 && (error.status === 0 || error.status >= 500);

// Administrator / teacher. The backend answers { data: [...] } without pages (the 200 most recent).
// params: { classId, studentId, status, from, to } (empty values are skipped)
export const useAbsences = (params, enabled = true) =>
  useQuery({
    queryKey: ['absences', 'list', params],
    enabled,
    staleTime: 0,
    queryFn: ({ signal }) => api(`/absences${buildQuery(params)}`, { signal }).then((r) => r.data),
    placeholderData: keepPreviousData,
    retry: retryOnServerTrouble,
  });

// Parent: the absences of their own children
export const useMyAbsences = () =>
  useQuery({
    queryKey: ['absences', 'mine'],
    staleTime: 0,
    queryFn: ({ signal }) => api('/absences/mine', { signal }).then((r) => r.data),
    retry: retryOnServerTrouble,
  });

// Students of a class. No student list is open to teachers, so we use the class results (same answer for
// administrator and teacher, limited to the teacher's classes) and keep only the students.
export const useClassRoster = (classId) =>
  useQuery({
    queryKey: ['absences-roster', classId],
    enabled: Boolean(classId),
    staleTime: 0,
    queryFn: ({ signal }) => api(`/report-cards/class/${classId}?term=ANNUAL`, { signal }),
    select: (response) =>
      response.students
        .map((row) => row.student)
        .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')),
    retry: retryOnServerTrouble,
  });

export function useAbsenceMutations() {
  const queryClient = useQueryClient();
  // The report cards show the number of absences too
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['absences'] }),
      queryClient.invalidateQueries({ queryKey: ['report-cards'] }),
    ]);

  // One request per student, one after the other. Never throws: the answer tells who failed and why.
  const record = useMutation({
    mutationFn: async ({ studentIds, date, period }) => {
      const results = [];
      for (const studentId of studentIds) {
        try {
          await api('/absences', { method: 'POST', body: { studentId, date, period } });
          results.push({ studentId, ok: true });
        } catch (error) {
          results.push({ studentId, ok: false, error });
        }
      }
      return results;
    },
    onSettled: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/absences/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  const justify = useMutation({
    mutationFn: ({ id, reason }) => api(`/absences/${id}/justify`, { method: 'POST', body: { reason } }),
    onSuccess: refresh,
  });

  const review = useMutation({
    mutationFn: ({ id, body }) => api(`/absences/${id}/review`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  return { record, remove, justify, review };
}