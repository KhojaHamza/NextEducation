// Messages written by the backend (in English) that we show in French
const known = {
  'Class is full': 'Cette classe est pleine. Choisis une autre classe ou augmente sa capacité.',
  'Student is already enrolled for this school year: use a transfer':
    'Cet élève est déjà inscrit cette année : utilise « Changer de classe ».',
  'Student is already in this class': 'Cet élève est déjà dans cette classe.',
  'A transfer must stay within the same school year': 'Le changement de classe doit rester dans la même année scolaire.',
  'Enrollment not found': 'Cette inscription est introuvable. Elle a peut-être déjà été retirée.',
  'Class not found': 'Cette classe est introuvable.',
  'Duplicate parent in the list': 'Un même parent ne peut pas être ajouté deux fois.',
  'One or more parents do not exist': 'Un des parents n’existe plus. Recharge la page.',
};

export const linkMessageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Recharge la page.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};