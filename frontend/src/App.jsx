import { Route, Routes } from 'react-router-dom';
import HomeRedirect from './app/HomeRedirect.jsx';
import ProtectedRoute from './app/ProtectedRoute.jsx';
import { PASSWORD_PATH, roleHome } from './app/roleHome.js';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import DashboardPlaceholder from './features/dashboard/DashboardPlaceholder.jsx';
import DesignPreview from './features/dev/DesignPreview.jsx';
import StudentDetailPage from './features/students/StudentDetailPage.jsx';
import StudentFormPage from './features/students/StudentFormPage.jsx';
import StudentsPage from './features/students/StudentsPage.jsx';
import AppShell from './layouts/AppShell.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/design" element={<DesignPreview />} />

      <Route element={<ProtectedRoute />}>
        <Route path={PASSWORD_PATH} element={<ChangePasswordPage />} />
      </Route>

      {/* Home page of each role */}
      {Object.entries(roleHome).map(([role, path]) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route element={<AppShell />}>
            <Route path={path} element={<DashboardPlaceholder />} />
          </Route>
        </Route>
      ))}

      {/* Administration pages */}
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/eleves" element={<StudentsPage />} />
          <Route path="/admin/eleves/nouveau" element={<StudentFormPage />} />
          <Route path="/admin/eleves/:id" element={<StudentDetailPage />} />
          <Route path="/admin/eleves/:id/modifier" element={<StudentFormPage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}