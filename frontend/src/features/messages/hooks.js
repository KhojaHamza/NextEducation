import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export const useThreads = () =>
  useQuery({
    queryKey: ['messages', 'threads'],
    queryFn: ({ signal }) => api('/messages/threads', { signal }).then((r) => r.data),
    staleTime: 30 * 1000,
  });

// Opening a thread marks it read on the server: refresh the badge and the thread list
export const useThread = (threadId) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['messages', 'thread', threadId],
    enabled: Boolean(threadId),
    queryFn: ({ signal }) =>
      api(`/messages/threads/${threadId}`, { signal }).then((r) => {
        queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
        return r.data;
      }),
  });
};

export const useDrafts = () =>
  useQuery({
    queryKey: ['messages', 'drafts'],
    queryFn: ({ signal }) => api('/messages/drafts', { signal }).then((r) => r.data),
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: ({ signal }) => api('/messages/unread-count', { signal }).then((r) => r.count),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  });

export const useContacts = () =>
  useQuery({
    queryKey: ['messages', 'contacts'],
    queryFn: ({ signal }) => api('/messages/contacts', { signal }).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

export function useMessageMutations() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['messages'] });

  const send = useMutation({
    mutationFn: (body) => api('/messages', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const updateDraft = useMutation({
    mutationFn: ({ id, body }) => api(`/messages/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const sendDraft = useMutation({
    mutationFn: (id) => api(`/messages/${id}/send`, { method: 'POST' }),
    onSuccess: refresh,
  });

  const deleteDraft = useMutation({
    mutationFn: (id) => api(`/messages/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  const hideMessage = useMutation({
    mutationFn: (id) => api(`/messages/${id}/hide`, { method: 'POST' }),
    onSuccess: refresh,
  });

  return { send, updateDraft, sendDraft, deleteDraft, hideMessage };
}