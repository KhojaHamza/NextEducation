import { LogOut } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../auth/useAuth.js';

const roleLabels = {
  ADMIN: 'Administration',
  TEACHER: 'Espace enseignant',
  PARENT: 'Espace parent',
  STUDENT: 'Espace élève',
  ACCOUNTANT: 'Comptabilité',
};

export default function DashboardPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <p className="font-bold text-sky">{roleLabels[user.role]}</p>
      <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
      <p className="text-lg">Ton tableau de bord arrive bientôt.</p>
      <Button variant="secondary" onClick={logout}>
        <LogOut className="size-4" aria-hidden="true" />
        Se déconnecter
      </Button>
    </main>
  );
}