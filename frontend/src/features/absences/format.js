import { formatDate } from '../students/format.js';

export const periodOptions = [
  { value: 'MORNING', label: 'Matin' },
  { value: 'AFTERNOON', label: 'Après-midi' },
];
export const periodLabel = Object.fromEntries(periodOptions.map((p) => [p.value, p.label]));

// NONE = no justification yet
export const statusMeta = {
  NONE: { label: 'Non justifiée', tone: 'warning' },
  PENDING: { label: 'En attente', tone: 'info' },
  ACCEPTED: { label: 'Justifiée', tone: 'success' },
  REJECTED: { label: 'Refusée', tone: 'danger' },
};

export const statusOptions = [
  { value: 'NONE', label: 'Non justifiées' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'ACCEPTED', label: 'Justifiées' },
  { value: 'REJECTED', label: 'Refusées' },
];

const pad = (n) => String(n).padStart(2, '0');

// Today in the local time zone, as "YYYY-MM-DD" (toISOString would shift the day)
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// The backend sends a calendar date at midnight UTC: we only keep the day, then show it at noon local time
export const formatAbsenceDate = (iso) => formatDate(`${String(iso).slice(0, 10)}T12:00:00`);

export const studentName = (s) => `${s.lastName} ${s.firstName}`;