// Turns an API error into a sentence that tells the person what to do
export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Cet élève est introuvable. Il a peut-être été supprimé.';
  if (err.status === 409) return err.message; // business rule written by the backend
  return 'Une erreur est survenue. Réessaie dans un instant.';
};