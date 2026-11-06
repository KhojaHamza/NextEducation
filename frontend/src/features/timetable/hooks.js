import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

const WEEK_PATH = { class: 'classes', teacher: 'teachers', room: 'rooms' };

const retryOnServerTrouble = (failureCount, error) =>
  failureCount < 2 && (error.status === 0 || error.status >= 500);

// One week of a class, a teacher or a room (administrator).
// The backend answers { data: { class | teacher | room, days: { MONDAY: [...], ... } } }
export const useWeek = (kind, id) =>
  useQuery({
    queryKey: ['timetable', kind, id],
    enabled: Boolean(id),
    staleTime: 0,
    queryFn: ({ signal }) => api(`/timetable/${WEEK_PATH[kind]}/${id}`, { signal }).then((r) => r.data),
    retry: retryOnServerTrouble,
  });

// Teacher: { days }. Parent: { students: [{ student, class, days }] }
export const useMyTimetable = () =>
  useQuery({
    queryKey: ['timetable', 'me'],
    staleTime: 0,
    queryFn: ({ signal }) => api('/timetable/me', { signal }).then((r) => r.data),
    retry: retryOnServerTrouble,
  });

// Options of the slot form (the backend caps a page at 100)
export const useSubjectOptions = () =>
  useQuery({
    queryKey: ['subjects', 'timetable-options'],
    queryFn: ({ signal }) => api('/subjects?limit=100', { signal }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

export const useRoomOptions = () =>
  useQuery({
    queryKey: ['rooms', 'options'],
    queryFn: ({ signal }) => api('/rooms?limit=100', { signal }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

// Dry run: saves nothing. The backend answers { ok, conflicts: [{ type, slotId, message }] }
export const checkSlot = (body) => api('/timetable/check', { method: 'POST', body });

export function useSlotMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['timetable'] });

  const create = useMutation({
    mutationFn: (body) => api('/timetable', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/timetable/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/timetable/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}