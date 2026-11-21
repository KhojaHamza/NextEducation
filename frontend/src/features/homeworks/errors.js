// Messages written by the backend (in English) that we show in French
const known = {
  'Homework not found': 'Ce devoir est introuvable. Il a peut-être été supprimé.',
  'Event not found': 'Cet événement est introuvable.',
  'Class not found': 'Cette classe est introuvable. Recharge la page.',
  'Subject not found': 'Cette matière est introuvable. Recharge la page.',
  'You are not assigned to this class and subject':
    'Tu n’es pas attribué(e) à cette matière dans cette classe : demande à l’administration.',
  'Due date cannot be in the past': 'La date limite ne peut pas être dans le passé.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];

  const m = /Subject level \((.+)\) does not match class level \((.+)\)/.exec(err.message);
  if (m) return `Cette matière est du niveau ${m[1]}, mais la classe est du niveau ${m[2]}.`;

  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Il a peut-être été supprimé.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
};