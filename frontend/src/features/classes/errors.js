// Messages written by the backend (in English) that we show in French
const known = {
  'This class still has students: reassign them first':
    'Cette classe a encore des élèves : change-les d’abord de classe.',
  'This class still has teacher assignments': 'Cette classe a encore des attributions d’enseignants.',
  'This class still has evaluations': 'Cette classe a encore des évaluations.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];

  const tooLow = /Capacity cannot be lower than the (\d+)/.exec(err.message);
  if (tooLow) return `La capacité ne peut pas être inférieure aux ${tooLow[1]} élèves déjà inscrits.`;

  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette classe est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};