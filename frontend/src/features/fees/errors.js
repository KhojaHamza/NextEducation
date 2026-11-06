// Messages written by the backend (in English) that we show in French
const known = {
  'School year not found': 'Cette année scolaire est introuvable.',
  'Payments exist for this school year: only the name and due date can be changed':
    'Des paiements existent déjà pour cette année : seuls le nom et la date d’échéance peuvent être modifiés.',
  'Payments exist for this school year: fee items can no longer be deleted':
    'Des paiements existent déjà pour cette année : ce frais ne peut plus être supprimé.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Ce frais est introuvable. Il a peut-être été supprimé.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};