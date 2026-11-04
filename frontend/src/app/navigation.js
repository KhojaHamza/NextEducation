import { GraduationCap, House, Presentation, School, Users } from 'lucide-react';
import { roleHome } from './roleHome.js';

// Only pages that already exist are listed here.
// Each new feature adds its own line for the roles that use it.
const adminPages = [
  { to: '/admin/eleves', label: 'Élèves', icon: GraduationCap },
  { to: '/admin/classes', label: 'Classes', icon: School },
  { to: '/admin/enseignants', label: 'Enseignants', icon: Presentation },
  { to: '/admin/parents', label: 'Parents', icon: Users },
];

export const navigationFor = (role) => [
  { to: roleHome[role], label: 'Accueil', icon: House },
  ...(role === 'ADMIN' ? adminPages : []),
];