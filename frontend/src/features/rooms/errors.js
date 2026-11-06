// Messages written by the backend (in English) that we show in French
const known = {
  'Room not found': 'Cette salle est introuvable. Elle a peut-être été supprimée.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette salle est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) return /unique|already|exist/i.test(err.message) ? 'Une salle avec ce nom existe déjà.' : err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};