import { useAuth } from '../auth/useAuth.js';

export default function DashboardPlaceholder() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-semibold">Bonjour {user.firstName} !</h1>
      <p className="text-lg">Ton tableau de bord arrive bientôt.</p>
    </div>
  );
}