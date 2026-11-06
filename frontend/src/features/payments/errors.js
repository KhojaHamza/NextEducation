// Messages written by the backend (in English) that we show in French
const known = {
  'Student not found': 'Cet élève est introuvable.',
  'School year not found': 'Cette année scolaire est introuvable.',
  'No current school year: set one first': 'Aucune année scolaire en cours : définis-en une dans « Années scolaires ».',
  'Student is not enrolled for this school year': 'Cet élève n’est inscrit dans aucune classe cette année.',
  'No fees are defined for this student level and school year':
    'Aucun frais n’est défini pour le niveau de cet élève cette année : crée-les dans « Frais scolaires ».',
  'Payment date cannot be in the future': 'La date du paiement ne peut pas être dans le futur.',
  'A reference is required for transfers and mobile money':
    'Une référence est obligatoire pour un virement ou un mobile money.',
  'A cancelled payment cannot be edited': 'Un paiement annulé ne peut plus être modifié.',
  'This payment is already cancelled': 'Ce paiement est déjà annulé.',
  'Payment not found': 'Ce paiement est introuvable.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  const exceeds = /^Amount exceeds the outstanding balance \((.+)\)$/.exec(err.message);
  if (exceeds) return `Le montant dépasse le solde restant (${exceeds[1]}).`;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Recharge la page.';
  if (err.status === 409) return err.message;
  return 'Une erreur est survenue. Réessaie dans un instant.';
};