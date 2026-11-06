export const actionLabel = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  RESTORE: 'Restauration',
  RESET_PASSWORD: 'Mot de passe réinitialisé',
};

export const actionTone = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  RESTORE: 'warning',
  RESET_PASSWORD: 'warning',
};

export const entityLabel = {
  User: 'Utilisateur',
  Teacher: 'Enseignant',
  Parent: 'Parent',
  Student: 'Élève',
  SchoolClass: 'Classe',
  Subject: 'Matière',
  Room: 'Salle',
  TeachingAssignment: 'Attribution',
  Evaluation: 'Évaluation',
  Grade: 'Note',
  Absence: 'Absence',
  Payment: 'Paiement',
  FeeItem: 'Frais',
  Enrollment: 'Inscription',
  SchoolYear: 'Année scolaire',
  Message: 'Message',
  Announcement: 'Annonce',
};

export const actionOptions = Object.entries(actionLabel).map(([value, label]) => ({ value, label }));
export const entityOptions = Object.entries(entityLabel).map(([value, label]) => ({ value, label }));

export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
};

export const prettyJson = (value) => {
  if (value === null || value === undefined) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};