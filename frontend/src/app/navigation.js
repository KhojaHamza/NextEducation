import { GraduationCap, House } from 'lucide-react';
import { roleHome } from './roleHome.js';

// Only pages that already exist are listed here.
// Each new feature adds its own line for the roles that use it.
const adminPages = [{ to: '/admin/eleves', label: 'Élèves', icon: GraduationCap }];

export const navigationFor = (role) => [
  { to: roleHome[role], label: 'Accueil', icon: House },
  ...(role === 'ADMIN' ? adminPages : []),
];