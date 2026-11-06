// Messages written by the backend (in English) that we show in French
const known = {
  'This subject is assigned to teachers':
    'Cette matière est attribuée à des enseignants : retire d’abord ces attributions.',
  'This subject has evaluations': 'Cette matière a encore des évaluations.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette matière est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) {
    return /unique|already|exist/i.test(err.message) ? 'Une matière avec ce nom existe déjà pour ce niveau.' : err.message;
  }
  return 'Une erreur est survenue. Réessaie dans un instant.';
};