import { Route, Routes } from 'react-router-dom';
import HomeRedirect from './app/HomeRedirect.jsx';
import ProtectedRoute from './app/ProtectedRoute.jsx';
import { PASSWORD_PATH, roleHome } from './app/roleHome.js';
import AbsencesPage from './features/absences/AbsencesPage.jsx';
import ParentAbsencesPage from './features/absences/ParentAbsencesPage.jsx';
import RollCallPage from './features/absences/RollCallPage.jsx';
import AssignmentsPage from './features/assignments/AssignmentsPage.jsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ClassesPage from './features/classes/ClassesPage.jsx';
import AdminDashboard from './features/dashboard/AdminDashboard.jsx';
import DashboardPlaceholder from './features/dashboard/DashboardPlaceholder.jsx';
import TeacherHome from './features/dashboard/TeacherHome.jsx';
import DesignPreview from './features/dev/DesignPreview.jsx';
import EvaluationsPage from './features/evaluations/EvaluationsPage.jsx';
import GradeEntryPage from './features/evaluations/GradeEntryPage.jsx';
import FeesPage from './features/fees/FeesPage.jsx';
import OverduePage from './features/payments/OverduePage.jsx';
import ParentPaymentsPage from './features/payments/ParentPaymentsPage.jsx';
import PaymentsPage from './features/payments/PaymentsPage.jsx';
import { peopleConfig } from './features/people/config.js';
import PeoplePage from './features/people/PeoplePage.jsx';
import ParentReportCardsPage from './features/reportCards/ParentReportCardsPage.jsx';
import ReportCardPage from './features/reportCards/ReportCardPage.jsx';
import ResultsPage from './features/reportCards/ResultsPage.jsx';
import RoomsPage from './features/rooms/RoomsPage.jsx';
import SchoolYearsPage from './features/schoolYears/SchoolYearsPage.jsx';
import StudentDetailPage from './features/students/StudentDetailPage.jsx';
import StudentFormPage from './features/students/StudentFormPage.jsx';
import StudentsPage from './features/students/StudentsPage.jsx';
import SubjectsPage from './features/subjects/SubjectsPage.jsx';
import MyTimetablePage from './features/timetable/MyTimetablePage.jsx';
import ParentTimetablePage from './features/timetable/ParentTimetablePage.jsx';
import TimetablePage from './features/timetable/TimetablePage.jsx';
import AppShell from './layouts/AppShell.jsx';
import AccountantHome from './features/dashboard/AccountantHome.jsx';

// Roles that already have a real home page; the others keep the placeholder for now
const homes = { ADMIN: <AdminDashboard />, TEACHER: <TeacherHome />, ACCOUNTANT: <AccountantHome /> };

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
            <Route path={path} element={homes[role] ?? <DashboardPlaceholder />} />
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
          <Route path="/admin/salles" element={<RoomsPage />} />
          <Route path="/admin/emploi-du-temps" element={<TimetablePage />} />
          <Route path="/admin/appel" element={<RollCallPage />} />
          <Route path="/admin/absences" element={<AbsencesPage />} />
          <Route path="/admin/evaluations" element={<EvaluationsPage />} />
          <Route path="/admin/evaluations/:id/notes" element={<GradeEntryPage />} />
          <Route path="/admin/resultats" element={<ResultsPage />} />
          <Route path="/admin/bulletins/:studentId" element={<ReportCardPage />} />
          <Route path="/admin/paiements" element={<PaymentsPage />} />
          <Route path="/admin/impayes" element={<OverduePage />} />
          <Route path="/admin/frais" element={<FeesPage />} />
          <Route path="/admin/annees" element={<SchoolYearsPage />} />
        </Route>
      </Route>

      {/* Teacher pages */}
      <Route element={<ProtectedRoute roles={['TEACHER']} />}>
        <Route element={<AppShell />}>
          <Route path="/enseignant/emploi-du-temps" element={<MyTimetablePage />} />
          <Route path="/enseignant/appel" element={<RollCallPage />} />
          <Route path="/enseignant/absences" element={<AbsencesPage />} />
          <Route path="/enseignant/evaluations" element={<EvaluationsPage />} />
          <Route path="/enseignant/evaluations/:id/notes" element={<GradeEntryPage />} />
          <Route path="/enseignant/resultats" element={<ResultsPage />} />
          <Route path="/enseignant/bulletins/:studentId" element={<ReportCardPage />} />
        </Route>
      </Route>

      {/* Parent pages */}
      <Route element={<ProtectedRoute roles={['PARENT']} />}>
        <Route element={<AppShell />}>
          <Route path="/parent/emploi-du-temps" element={<ParentTimetablePage />} />
          <Route path="/parent/absences" element={<ParentAbsencesPage />} />
          <Route path="/parent/bulletins" element={<ParentReportCardsPage />} />
          <Route path="/parent/bulletins/:studentId" element={<ReportCardPage />} />
          <Route path="/parent/paiements" element={<ParentPaymentsPage />} />
        </Route>
      </Route>

      {/* Accountant pages */}
      <Route element={<ProtectedRoute roles={['ACCOUNTANT']} />}>
        <Route element={<AppShell />}>
          <Route path="/comptabilite/paiements" element={<PaymentsPage />} />
          <Route path="/comptabilite/impayes" element={<OverduePage />} />
          <Route path="/comptabilite/frais" element={<FeesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}