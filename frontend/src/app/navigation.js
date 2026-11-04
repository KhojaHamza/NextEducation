import { House } from 'lucide-react';
import { roleHome } from './roleHome.js';

// Only pages that already exist are listed here.
// Each new feature (students, grades, timetable...) adds its own line for the roles that use it.
export const navigationFor = (role) => [
  { to: roleHome[role], label: 'Accueil', icon: House },
];