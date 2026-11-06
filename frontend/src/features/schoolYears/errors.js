// Messages written by the backend (in English) that we show in French
const known = {
  'Format must be YYYY-YYYY': 'Le libellé doit avoir le format 2026-2027.',
  'startDate must be before endDate': 'La date de début doit être avant la date de fin.',
  'Set another year as current instead': 'Pour changer l’année en cours, définis une autre année comme année en cours.',
  'Cannot delete the current school year': 'Tu ne peux pas supprimer l’année en cours.',
  'This school year still has classes or students':
    'Cette année a encore des classes ou des élèves : elle ne peut pas être supprimée.',
  'This school year still has fee items': 'Cette année a encore des frais configurés.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cette année scolaire est introuvable. Elle a peut-être été supprimée.';
  if (err.status === 409) return /unique|already|exist/i.test(err.message) ? 'Une année avec ce libellé existe déjà.' : err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};