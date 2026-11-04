import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'd MMMM yyyy', { locale: fr });
};

export const genderLabel = (gender) => (gender === 'FEMALE' ? 'Fille' : 'Garçon');

export const classLabel = (schoolClass) => `${schoolClass.level} ${schoolClass.section}`;

export const relationLabel = { father: 'Père', mother: 'Mère', guardian: 'Tuteur légal' };