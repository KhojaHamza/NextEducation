import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const roleLabel = {
  ADMIN: 'Administration',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  ACCOUNTANT: 'Comptabilité',
};

export const formatDateTime = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, "d MMM yyyy 'à' HH:mm", { locale: fr });
};

// Thread list: "14:32" if today, "12 sept." otherwise
export const formatShortDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
  return format(d, 'd MMM', { locale: fr });
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};