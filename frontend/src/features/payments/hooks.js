import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { saveFile } from '../../api/download.js';
import { buildQuery } from '../../api/queries.js';

// A missing student account (404) will not appear by retrying: only retry when the server is unreachable or failing
const retryOnServerTrouble = (failureCount, error) =>
  failureCount < 2 && (error.status === 0 || error.status >= 500);

// Student picker of the payment form. The backend answers { data: [...] }
export const useStudentSearch = (search) =>
  useQuery({
    queryKey: ['students', 'payment-search', search],
    enabled: search.length >= 2,
    queryFn: ({ signal }) => api(`/students${buildQuery({ search, limit: 8 })}`, { signal }).then((r) => r.data),
  });

// Installments, paid, balance of one student (current school year). The backend answers { data: {...} }
export const useStudentAccount = (studentId) =>
  useQuery({
    queryKey: ['payments', 'account', studentId],
    enabled: Boolean(studentId),
    staleTime: 0,
    queryFn: ({ signal }) => api(`/payments/account/${studentId}`, { signal }).then((r) => r.data),
    retry: retryOnServerTrouble,
  });

// The backend answers { totals: { balance, overdue, students }, data: [...] } (no extra wrapper)
export const useOverdue = ({ schoolYearId, classId, all }) =>
  useQuery({
    queryKey: ['payments', 'overdue', { schoolYearId, classId, all }],
    enabled: Boolean(schoolYearId),
    staleTime: 0,
    queryFn: ({ signal }) =>
      api(`/payments/overdue${buildQuery({ schoolYearId, classId, all: all ? 'true' : '' })}`, { signal }),
    retry: retryOnServerTrouble,
  });

// Parent: payments of the own children
export const useMyPayments = () =>
  useQuery({
    queryKey: ['payments', 'mine'],
    staleTime: 0,
    queryFn: ({ signal }) => api('/payments/mine', { signal }).then((r) => r.data),
    retry: retryOnServerTrouble,
  });

// Downloads the PDF receipt (throws an ApiError: the caller shows it in a toast)
export async function downloadReceipt(payment) {
  const file = await api(`/payments/${payment.id}/receipt`, { asBlob: true });
  saveFile(file, `recu-${payment.receiptNumber}.pdf`);
}

export function usePaymentMutations() {
  const queryClient = useQueryClient();
  // Lists, balances, unpaid list: everything under "payments" depends on a payment
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['payments'] });

  // The backend answers { data: payment, balance, notified: { inApp, email } }
  const create = useMutation({
    mutationFn: (body) => api('/payments', { method: 'POST', body }),
    onSuccess: refresh,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => api(`/payments/${id}`, { method: 'PATCH', body }),
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }) => api(`/payments/${id}/cancel`, { method: 'POST', body: { reason } }),
    onSuccess: refresh,
  });

  // dryRun: preview only, nothing is sent
  const reminders = useMutation({
    mutationFn: ({ dryRun }) => api(`/payments/reminders/run${dryRun ? '?dryRun=true' : ''}`, { method: 'POST' }),
  });

  return { create, update, cancel, reminders };
}