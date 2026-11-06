export const dayOptions = [
  { value: 'MONDAY', label: 'Lundi' },
  { value: 'TUESDAY', label: 'Mardi' },
  { value: 'WEDNESDAY', label: 'Mercredi' },
  { value: 'THURSDAY', label: 'Jeudi' },
  { value: 'FRIDAY', label: 'Vendredi' },
  { value: 'SATURDAY', label: 'Samedi' },
];

export const DAYS = dayOptions.map((d) => d.value);
export const dayLabel = Object.fromEntries(dayOptions.map((d) => [d.value, d.label]));

// The backend writes its conflict messages in English: we rewrite the known ones in French
export const conflictText = (message) => {
  let m = message.match(/^The class already has (.+?) with (.+?) \((.+)\)$/);
  if (m) return `La classe a déjà cours de ${m[1]} avec ${m[2]} (${m[3]}).`;

  m = message.match(/^(.+?) already teaches (.+?) \((.+)\)$/);
  if (m) return `${m[1]} enseigne déjà en ${m[2]} (${m[3]}).`;

  m = message.match(/^Room (.+?) is already used by (.+?) \((.+)\)$/);
  if (m) return `La salle ${m[1]} est déjà utilisée par ${m[2]} (${m[3]}).`;

  if (message === 'This teacher is not assigned to this subject and class') {
    return 'Cet enseignant n’est pas attribué à cette matière et à cette classe (voir « Attributions »).';
  }
  return message;
};