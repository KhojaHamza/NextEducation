// Messages written by the backend (in English) that we show in French
const known = {
  'Student not found': 'Cet élève est introuvable.',
  'Class not found': 'Cette classe est introuvable.',
};

export const isNoEnrollment = (err) => err?.status === 404 && /no enrollment/i.test(err.message);

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (isNoEnrollment(err)) return 'Cet élève n’est inscrit dans aucune classe pour cette année scolaire.';
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas accès à ce bulletin.';
  if (err.status === 404) return 'Bulletin introuvable.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
};