import { Route, Routes } from 'react-router-dom';
import HomeRedirect from './app/HomeRedirect.jsx';
import ProtectedRoute from './app/ProtectedRoute.jsx';
import { PASSWORD_PATH, roleHome } from './app/roleHome.js';
import AbsencesPage from './features/absences/AbsencesPage.jsx';
import StudentAbsencesPage from './features/absences/StudentAbsencesPage.jsx';
import ParentAbsencesPage from './features/absences/ParentAbsencesPage.jsx';
import RollCallPage from './features/absences/RollCallPage.jsx';
import AnnouncementsPage from './features/announcements/AnnouncementsPage.jsx';
import AssignmentsPage from './features/assignments/AssignmentsPage.jsx';
import AuditLogsPage from './features/auditLogs/AuditLogsPage.jsx';
import ChangePasswordPage from './features/auth/ChangePasswordPage.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ClassesPage from './features/classes/ClassesPage.jsx';
import AdminDashboard from './features/dashboard/AdminDashboard.jsx';
import AccountantHome from './features/dashboard/AccountantHome.jsx';
import DashboardPlaceholder from './features/dashboard/DashboardPlaceholder.jsx';
import ParentHome from './features/dashboard/ParentHome.jsx';
import StudentHome from './features/dashboard/StudentHome.jsx';
import TeacherHome from './features/dashboard/TeacherHome.jsx';
import DesignPreview from './features/dev/DesignPreview.jsx';
import EvaluationsPage from './features/evaluations/EvaluationsPage.jsx';
import GradeEntryPage from './features/evaluations/GradeEntryPage.jsx';
import FeesPage from './features/fees/FeesPage.jsx';
import MessagesPage from './features/messages/MessagesPage.jsx';
import ThreadPage from './features/messages/ThreadPage.jsx';
import NotificationsPage from './features/notifications/NotificationsPage.jsx';
import OverduePage from './features/payments/OverduePage.jsx';
import ParentPaymentsPage from './features/payments/ParentPaymentsPage.jsx';
import PaymentsPage from './features/payments/PaymentsPage.jsx';
import { peopleConfig } from './features/people/config.js';
import PeoplePage from './features/people/PeoplePage.jsx';
import ParentReportCardsPage from './features/reportCards/ParentReportCardsPage.jsx';
import StudentReportCardsPage from './features/reportCards/StudentReportCardsPage.jsx';
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
import StudentTimetablePage from './features/timetable/StudentTimetablePage.jsx';
import TimetablePage from './features/timetable/TimetablePage.jsx';
import UsersPage from './features/users/UsersPage.jsx';
import AppShell from './layouts/AppShell.jsx';

const homes = { 
  ADMIN: <AdminDashboard />, 
  TEACHER: <TeacherHome />, 
  PARENT: <ParentHome />, 
  STUDENT: <StudentHome />,
  ACCOUNTANT: <AccountantHome />
};

export default function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/design" element={<DesignPreview />} />

      <Route element={<ProtectedRoute />}>
        <Route path={PASSWORD_PATH} element={<ChangePasswordPage />} />
      </Route>

      {Object.entries(roleHome).map(([role, path]) => (
        <Route key={role} element={<ProtectedRoute roles={[role]} />}>
          <Route element={<AppShell />}>
            <Route path={path} element={homes[role] ?? <DashboardPlaceholder />} />
          </Route>
        </Route>
      ))}

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:threadId" element={<ThreadPage />} />
          <Route path="/annonces" element={<AnnouncementsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/eleves" element={<StudentsPage />} />
          <Route path="/admin/eleves/nouveau" element={<StudentFormPage />} />
          <Route path="/admin/eleves/:id" element={<StudentDetailPage />} />
          <Route path="/admin/eleves/:id/modifier" element={<StudentFormPage />} />
          <Route path="/admin/classes" element={<ClassesPage />} />
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
          <Route path="/admin/utilisateurs" element={<UsersPage />} />
          <Route path="/admin/journal" element={<AuditLogsPage />} />
        </Route>
      </Route>

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

      <Route element={<ProtectedRoute roles={['PARENT']} />}>
        <Route element={<AppShell />}>
          <Route path="/parent/emploi-du-temps" element={<ParentTimetablePage />} />
          <Route path="/parent/absences" element={<ParentAbsencesPage />} />
          <Route path="/parent/bulletins" element={<ParentReportCardsPage />} />
          <Route path="/parent/bulletins/:studentId" element={<ReportCardPage />} />
          <Route path="/parent/paiements" element={<ParentPaymentsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['STUDENT']} />}>
        <Route element={<AppShell />}>
          <Route path="/eleve/emploi-du-temps" element={<StudentTimetablePage />} />
          <Route path="/eleve/absences" element={<StudentAbsencesPage />} />
          <Route path="/eleve/bulletins" element={<StudentReportCardsPage />} />
          <Route path="/eleve/bulletins/:studentId" element={<ReportCardPage />} />
        </Route>
      </Route>

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