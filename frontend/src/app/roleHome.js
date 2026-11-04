export const PASSWORD_PATH = '/mot-de-passe';
// One home page per role (the real dashboards come later)
export const roleHome = {
  ADMIN: '/admin',
  TEACHER: '/enseignant',
  PARENT: '/parent',
  STUDENT: '/eleve',
  ACCOUNTANT: '/comptabilite',
};

export const homeFor = (role) => roleHome[role] ?? '/connexion';