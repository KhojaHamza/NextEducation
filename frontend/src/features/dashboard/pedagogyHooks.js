import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

// Construit « ?a=1&b=2 » en ignorant les valeurs vides
const qs = (params) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const usePedagogyDashboard = ({ term, schoolYearId }, enabled = true) =>
  useQuery({
    queryKey: ['dashboard', 'pedagogy', term, schoolYearId],
    queryFn: async ({ signal }) => (await api(`/dashboard/pedagogique${qs({ term, schoolYearId })}`, { signal })).data,
    enabled,
    placeholderData: keepPreviousData,
  });

// Classement d'une classe (route déjà existante des bulletins)
export const useClassRanking = (classId, term) =>
  useQuery({
    queryKey: ['dashboard', 'class-ranking', classId, term],
    queryFn: ({ signal }) => api(`/report-cards/class/${classId}${qs({ term })}`, { signal }),
    enabled: Boolean(classId),
  });
