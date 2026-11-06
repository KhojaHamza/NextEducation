import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export function useRoomMutations() {
  const queryClient = useQueryClient();
  // The room pickers of the timetable depend on the rooms
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['rooms'] });

  const create = useMutation({
    mutationFn: (body) => api('/rooms', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/rooms/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id) => api(`/rooms/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  return { create, update, remove };
}

// The backend does not check scheduled courses when a room is deleted: we check before asking
export const countRoomSlots = (roomId) =>
  api(`/timetable?roomId=${roomId}`).then((response) => response.data.length);