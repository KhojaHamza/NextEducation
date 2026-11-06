export const roleLabel = {
  ADMIN: 'Administrateur',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  STUDENT: 'Élève',
  ACCOUNTANT: 'Comptabilité',
};

export const roleOptions = [
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'STUDENT', label: 'Élève' },
  { value: 'ACCOUNTANT', label: 'Comptabilité' },
];

export const fullName = (u) =>
  `${u?.lastName ?? ''} ${u?.firstName ?? ''}`.trim() || u?.email || '—';