// Messages written by the backend (in English) that we show in French
const known = {
  'Evaluation not found': 'Cette évaluation est introuvable. Elle a peut-être été supprimée.',
  'Class not found': 'Cette classe est introuvable. Recharge la page.',
  'Subject not found': 'Cette matière est introuvable. Recharge la page.',
  'You are not assigned to this class and subject':
    'Tu n’es pas attribué(e) à cette matière dans cette classe : demande à l’administration.',
  'Duplicate student in the list': 'Un élève apparaît deux fois dans la liste.',
  'Some students are not enrolled in this class':
    'Certains élèves ne sont plus inscrits dans cette classe. Recharge la page.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];

  let m = /Date must be within the school year (.+)/.exec(err.message);
  if (m) return `La date doit être comprise dans l’année scolaire ${m[1]}.`;

  m = /(\d+) existing grade\(s\) exceed the new maximum score/.exec(err.message);
  if (m) return `${m[1]} note(s) dépassent le nouveau maximum : corrige-les d’abord.`;

  m = /Score above the maximum \((.+)\)/.exec(err.message);
  if (m) return `Une note dépasse le maximum (${m[1]}).`;

  m = /Subject level \((.+)\) does not match class level \((.+)\)/.exec(err.message);
  if (m) return `Cette matière est du niveau ${m[1]}, mais la classe est du niveau ${m[2]}.`;

  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette évaluation est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};