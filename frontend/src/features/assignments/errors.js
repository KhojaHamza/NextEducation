// Messages written by the backend (in English) that we show in French
const known = {
  'This assignment already exists': 'Cette attribution existe déjà.',
  'Teacher not found': 'Cet enseignant est introuvable. Recharge la page.',
  'Subject not found': 'Cette matière est introuvable. Recharge la page.',
  'Class not found': 'Cette classe est introuvable. Recharge la page.',
  'Assignment not found': 'Cette attribution est introuvable. Elle a peut-être déjà été retirée.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];

  const level = /Subject level \((.+)\) does not match class level \((.+)\)/.exec(err.message);
  if (level) return `Cette matière est du niveau ${level[1]}, mais la classe est du niveau ${level[2]}.`;

  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};