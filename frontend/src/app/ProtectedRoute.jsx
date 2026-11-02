import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PageLoader from '../components/ui/PageLoader.jsx';
import { useAuth } from '../features/auth/useAuth.js';
import { PASSWORD_PATH, homeFor } from './roleHome.js';

// Wraps pages that need a login, and optionally a given role
export default function ProtectedRoute({ roles }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader />;
  if (status === 'anonymous') {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />;
  }

  // A temporary password must be replaced before anything else
  if (user.mustChangePassword && location.pathname !== PASSWORD_PATH) {
    return <Navigate to={PASSWORD_PATH} replace />;
  }

  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}