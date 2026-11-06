// Messages written by the backend (in English) that we show in French
const known = {
  'Absence not found': 'Cette absence est introuvable. Elle a peut-être été retirée.',
  'Student not found': 'Cet élève est introuvable.',
  'Class not found': 'Cette classe est introuvable.',
  'An absence cannot be in the future': 'Une absence ne peut pas être dans le futur.',
  'No school year covers this date': 'Aucune année scolaire ne couvre cette date.',
  'This absence is already recorded': 'Cette absence est déjà enregistrée.',
  'A justification was already submitted for this absence': 'Un justificatif a déjà été envoyé pour cette absence.',
  'This absence is already justified': 'Cette absence est déjà justifiée.',
  'You do not have permission to do this': 'Tu n’as pas le droit de faire cette action.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  const notEnrolled = err.message.match(/^Student is not enrolled in (.+)$/);
  if (notEnrolled) return `Cet élève n’est pas inscrit en ${notEnrolled[1]}.`;
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Recharge la page.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
};