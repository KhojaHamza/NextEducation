
import { Route, Routes } from 'react-router-dom';
import HomeRedirect from './app/HomeRedirect.jsx';
import ProtectedRoute from './app/ProtectedRoute.jsx';
import { PASSWORD_PATH, roleHome } from './app/roleHome.js';
import LoginPage from './features/auth/LoginPage.jsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import DashboardPlaceholder from './features/dashboard/DashboardPlaceholder.jsx';
import DesignPreview from './features/dev/DesignPreview.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/design" element={<DesignPreview />} />

      {/* Changement du mot de passe temporaire */}
      <Route element={<ProtectedRoute />}>
        <Route
          path={PASSWORD_PATH}
          element={<ChangePasswordPage />}
        />
      </Route>

      {/* Pages protégées selon le rôle */}
      {Object.entries(roleHome).map(([role, path]) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route path={path} element={<DashboardPlaceholder />} />
        </Route>
      ))}

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
