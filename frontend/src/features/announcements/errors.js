// Messages written by the backend (in English) that we show in French
const known = {
  'Announcement not found': 'Cette annonce est introuvable.',
  'The announcement to correct does not exist': 'L’annonce à corriger n’existe pas.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette annonce est introuvable.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
};