import {
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  House,
  Megaphone,
  MessageCircle,
  Presentation,
  School,
  ScrollText,
  Trophy,
  UserCheck,
  UserCog,
  UserX,
  Users,
  Wallet,
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
  { to: '/admin/salles', label: 'Salles', icon: Building2 },
  { to: '/admin/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock },
  { to: '/admin/appel', label: 'Appel', icon: ClipboardCheck },
  { to: '/admin/absences', label: 'Absences', icon: UserX },
  { to: '/admin/evaluations', label: 'Évaluations', icon: ClipboardList },
  { to: '/admin/resultats', label: 'Résultats', icon: Trophy },
  { to: '/admin/paiements', label: 'Paiements', icon: CreditCard },
  { to: '/admin/impayes', label: 'Impayés', icon: CircleAlert },
  { to: '/admin/frais', label: 'Frais scolaires', icon: Wallet },
  { to: '/admin/annees', label: 'Années scolaires', icon: CalendarDays },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: UserCog },
  { to: '/admin/journal', label: 'Journal d’audit', icon: ScrollText },
];

const teacherPages = [
  { to: '/enseignant/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock },
  { to: '/enseignant/appel', label: 'Appel', icon: ClipboardCheck },
  { to: '/enseignant/absences', label: 'Absences', icon: UserX },
  { to: '/enseignant/evaluations', label: 'Évaluations', icon: ClipboardList },
  { to: '/enseignant/resultats', label: 'Résultats', icon: Trophy },
];

const parentPages = [
  { to: '/parent/emploi-du-temps', label: 'Emploi du temps', icon: CalendarClock },
  { to: '/parent/absences', label: 'Absences', icon: UserX },
  { to: '/parent/bulletins', label: 'Bulletins', icon: FileText },
  { to: '/parent/paiements', label: 'Paiements', icon: CreditCard },
];

const accountantPages = [
  { to: '/comptabilite/paiements', label: 'Paiements', icon: CreditCard },
  { to: '/comptabilite/impayes', label: 'Impayés', icon: CircleAlert },
  { to: '/comptabilite/frais', label: 'Frais scolaires', icon: Wallet },
];

// All authenticated roles can use these
const sharedPages = [
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/annonces', label: 'Annonces', icon: Megaphone },
];

export const navigationFor = (role) => [
  { to: roleHome[role], label: 'Accueil', icon: House },
  ...(role === 'ADMIN' ? adminPages : []),
  ...(role === 'TEACHER' ? teacherPages : []),
  ...(role === 'PARENT' ? parentPages : []),
  ...(role === 'ACCOUNTANT' ? accountantPages : []),
  ...sharedPages,
];