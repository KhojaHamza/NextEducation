import { Route, Routes } from 'react-router-dom';
import HomeRedirect from './app/HomeRedirect.jsx';
import ProtectedRoute from './app/ProtectedRoute.jsx';
import { PASSWORD_PATH, roleHome } from './app/roleHome.js';
import AssignmentsPage from './features/assignments/AssignmentsPage.jsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ClassesPage from './features/classes/ClassesPage.jsx';
import AdminDashboard from './features/dashboard/AdminDashboard.jsx';
import DashboardPlaceholder from './features/dashboard/DashboardPlaceholder.jsx';
import DesignPreview from './features/dev/DesignPreview.jsx';
import EvaluationsPage from './features/evaluations/EvaluationsPage.jsx';
import { peopleConfig } from './features/people/config.js';
import PeoplePage from './features/people/PeoplePage.jsx';
import SchoolYearsPage from './features/schoolYears/SchoolYearsPage.jsx';
import StudentDetailPage from './features/students/StudentDetailPage.jsx';
import StudentFormPage from './features/students/StudentFormPage.jsx';
import StudentsPage from './features/students/StudentsPage.jsx';
import SubjectsPage from './features/subjects/SubjectsPage.jsx';
import AppShell from './layouts/AppShell.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/design" element={<DesignPreview />} />

      <Route element={<ProtectedRoute />}>
        <Route path={PASSWORD_PATH} element={<ChangePasswordPage />} />
      </Route>

      {/* Home page of each role (only the administrator has a real dashboard for now) */}
      {Object.entries(roleHome).map(([role, path]) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route element={<AppShell />}>
            <Route path={path} element={role === 'ADMIN' ? <AdminDashboard /> : <DashboardPlaceholder />} />
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
          <Route path="/admin/classes" element={<ClassesPage />} />
          {/* The key makes React start fresh (search, page) when switching between the two */}
          <Route path="/admin/enseignants" element={<PeoplePage key="teachers" config={peopleConfig.teachers} />} />
          <Route path="/admin/parents" element={<PeoplePage key="parents" config={peopleConfig.parents} />} />
          <Route path="/admin/matieres" element={<SubjectsPage />} />
          <Route path="/admin/attributions" element={<AssignmentsPage />} />
          <Route path="/admin/evaluations" element={<EvaluationsPage />} />
          <Route path="/admin/annees" element={<SchoolYearsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}