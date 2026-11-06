import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { buildQuery } from '../../api/queries.js';

// A missing report card (404) will not appear by retrying: only retry when the server is unreachable or failing
const retryOnServerTrouble = (failureCount, error) =>
  failureCount < 2 && (error.status === 0 || error.status >= 500);

// Results change every time a grade is saved: always refetch when a page opens (staleTime 0).
// While another term loads we keep the previous answer, but never the answer of another student or class.
const keepSameSubject = (position, subject) => (previousData, previousQuery) =>
  previousQuery?.queryKey[position] === subject ? previousData : undefined;

// The backend answers { data: { ...report card } }
export const useReportCard = (studentId, { term, schoolYearId }) =>
  useQuery({
    queryKey: ['report-cards', 'student', studentId, term, schoolYearId],
    queryFn: ({ signal }) =>
      api(`/report-cards/${studentId}${buildQuery({ term, schoolYearId })}`, { signal }).then((r) => r.data),
    staleTime: 0,
    placeholderData: keepSameSubject(2, studentId),
    retry: retryOnServerTrouble,
  });

// The backend answers { class, term, classAverage, rankedCount, students } (no "data" wrapper)
export const useClassResults = (classId, term) =>
  useQuery({
    queryKey: ['report-cards', 'class', classId, term],
    enabled: Boolean(classId),
    queryFn: ({ signal }) => api(`/report-cards/class/${classId}${buildQuery({ term })}`, { signal }),
    staleTime: 0,
    placeholderData: keepSameSubject(2, classId),
    retry: retryOnServerTrouble,
  });

// A parent's children
export const useMyChildren = () =>
  useQuery({
    queryKey: ['students', 'mine'],
    queryFn: ({ signal }) => api('/students/mine', { signal }).then((r) => r.data),
  });