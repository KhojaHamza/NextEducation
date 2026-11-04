// Messages written by the backend (in English) that we show in French
const known = {
  'This teacher is the homeroom teacher of a class':
    'Cet enseignant est titulaire d’une classe : change d’abord le titulaire de cette classe.',
  'This teacher still has subject assignments': 'Cet enseignant a encore des matières attribuées.',
  'This parent is still linked to students: unlink them first':
    'Ce parent est encore lié à des élèves : retire d’abord ces liens.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 409 && /e-?mail/i.test(err.message)) return 'Cette adresse e-mail est déjà utilisée.';
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette personne est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};