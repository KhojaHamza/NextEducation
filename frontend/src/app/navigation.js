import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  House,
  Presentation,
  School,
  UserCheck,
  Users,
} from 'lucide-react';
import { roleHome } from './roleHome.js';

// Only pages that already exist are listed here.
// Each new feature adds its own line for the roles that use it.
const adminPages = [
  { to: '/admin/eleves', label: 'Élèves', icon: GraduationCap },
  { to: '/admin/classes', label: 'Classes', icon: School },
  { to: '/admin/enseignants', label: 'Enseignants', icon: Presentation },
  { to: '/admin/parents', label: 'Parents', icon: Users },
  { to: '/admin/matieres', label: 'Matières', icon: BookOpen },
  { to: '/admin/attributions', label: 'Attributions', icon: UserCheck },
  { to: '/admin/evaluations', label: 'Évaluations', icon: ClipboardList },
  { to: '/admin/annees', label: 'Années scolaires', icon: CalendarDays },
];

const teacherPages = [{ to: '/enseignant/evaluations', label: 'Évaluations', icon: ClipboardList }];

export const navigationFor = (role) => [
  { to: roleHome[role], label: 'Accueil', icon: House },
  ...(role === 'ADMIN' ? adminPages : []),
  ...(role === 'TEACHER' ? teacherPages : []),
];