import { Navigate } from 'react-router-dom';
import PageLoader from '../components/ui/PageLoader.jsx';
import { useAuth } from '../features/auth/useAuth.js';
import { PASSWORD_PATH, homeFor } from './roleHome.js';

export default function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous') return <Navigate to="/connexion" replace />;
  return <Navigate to={user.mustChangePassword ? PASSWORD_PATH : homeFor(user.role)} replace />;
}