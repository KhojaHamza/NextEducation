import { conflictText } from './format.js';

// Messages written by the backend (in English) that we show in French
const known = {
  'Timetable slot not found': 'Ce créneau est introuvable. Il a peut-être été supprimé.',
  'Class not found': 'Cette classe est introuvable.',
  'Subject not found': 'Cette matière est introuvable.',
  'Teacher not found': 'Cet enseignant est introuvable.',
  'Room not found': 'Cette salle est introuvable.',
  'Room not found or unavailable': 'Cette salle est introuvable ou indisponible.',
  'The end time must be after the start time': 'L’heure de fin doit être après l’heure de début.',
  'You can only view your own timetable': 'Tu ne peux voir que ton propre emploi du temps.',
};

const CONFLICT_PREFIX = 'Timetable conflict: ';

export const messageFor = (err) => {
  if (err.status === 0) return err.message;
  if (err.status === 409 && err.message.startsWith(CONFLICT_PREFIX)) {
    return err.message
      .slice(CONFLICT_PREFIX.length)
      .split(' | ')
      .map(conflictText)
      .join(' ');
  }
  if (known[err.message]) return known[err.message];
  if (err.status === 400) return `Informations invalides : ${err.message}`;
  if (err.status === 403) return 'Tu n’as pas le droit de faire cette action.';
  if (err.status === 404) return 'Élément introuvable. Recharge la page.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
};