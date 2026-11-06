// Messages written by the backend (in English) that we show in French
const known = {
  'User not found': 'Cet utilisateur est introuvable. Il a peut-être été supprimé.',
  'Email already in use': 'Cette adresse e-mail est déjà utilisée.',
  'This email is already taken': 'Cette adresse e-mail est déjà utilisée.',
  'You cannot delete your own account': 'Tu ne peux pas supprimer ton propre compte.',
  'You cannot deactivate your own account': 'Tu ne peux pas désactiver ton propre compte.',
  'Cannot delete the last administrator': 'Impossible de supprimer le dernier administrateur.',
  'Invalid role': 'Rôle invalide.',
};

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cet utilisateur est introuvable.';
  if (err.status === 409) {
    return /unique|already|exist/i.test(err.message)
      ? 'Cette adresse e-mail est déjà utilisée.'
      : err.message;
  }
  return 'Une erreur est survenue. Réessaie dans un instant.';
};