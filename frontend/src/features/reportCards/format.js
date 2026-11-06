// "ANNUAL" is the whole year: the backend computes it from every term
export const termOptions = [
  { value: 'T1', label: '1er trimestre' },
  { value: 'T2', label: '2e trimestre' },
  { value: 'T3', label: '3e trimestre' },
  { value: 'ANNUAL', label: 'Année complète' },
];

export const TERMS = termOptions.map((t) => t.value);

export const termName = (value) => termOptions.find((t) => t.value === value)?.label ?? value;

// An average out of 20 with a decimal comma; null means "no grade yet"
export const fmtAverage = (n) => (n === null || n === undefined ? '—' : n.toFixed(2).replace('.', ','));

// The backend writes the mention in French
export const mentionTone = {
  'Très bien': 'success',
  Bien: 'success',
  'Assez bien': 'info',
  Passable: 'warning',
  Insuffisant: 'danger',
};