import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export const useNotifications = (unreadOnly = false) =>
  useQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: ({ signal }) =>
      api(`/notifications${unreadOnly ? '?unread=true' : ''}`, { signal }).then((r) => r.data),
    refetchInterval: 60 * 1000,
  });

export const useNotificationsUnreadCount = () =>
  useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: ({ signal }) => api('/notifications/unread-count', { signal }).then((r) => r.count),
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({
    mutationFn: (id) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: refresh,
  });

  return { markRead, markAllRead };
}