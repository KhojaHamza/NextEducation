export const PASSWORD_PATH = '/mot-de-passe';

// One home page per role (the real dashboards come later)
export const roleHome = {
  ADMIN: '/admin',
  TEACHER: '/enseignant',
  PARENT: '/parent',
  STUDENT: '/eleve',
  ACCOUNTANT: '/comptabilite',
};

// Le SUPER_ADMIN n'a pas d'ecole : son accueil est la console plateforme.
export const homeFor = (role) =>
  role === 'SUPER_ADMIN' ? '/plateforme' : (roleHome[role] ?? '/connexion');