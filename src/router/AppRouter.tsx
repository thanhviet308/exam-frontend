import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import TeacherLayout from '../layouts/TeacherLayout'
import StudentLayout from '../layouts/StudentLayout'
import SupervisorLayout from '../layouts/SupervisorLayout'
import AdminDashboard from '../pages/admin/AdminDashboard'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminGroupsPage from '../pages/admin/AdminGroupsPage'
import AdminSubjectsPage from '../pages/admin/AdminSubjectsPage'
import AdminAssignPage from '../pages/admin/AdminAssignPage'
import AdminStatisticsPage from '../pages/admin/AdminStatisticsPage'
import TeacherDashboard from '../pages/teacher/TeacherDashboard'
import PassagesPage from '../pages/teacher/PassagesPage'
import QuestionBankPage from '../pages/teacher/QuestionBankPage'
import ExamTemplatePage from '../pages/teacher/ExamTemplatePage'
import ExamInstancePage from '../pages/teacher/ExamInstancePage'
import TeacherResultsPage from '../pages/teacher/TeacherResultsPage'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentExamListPage from '../pages/student/StudentExamListPage'
import StudentHistoryPage from '../pages/student/StudentHistoryPage'
import StudentProfilePage from '../pages/student/StudentProfilePage'
import StudentExamTakingPage from '../pages/student/StudentExamTakingPage'
import StudentExamResultPage from '../pages/student/StudentExamResultPage'
import SupervisorDashboard from '../pages/supervisor/SupervisorDashboard'
import SupervisorExamSessionsPage from '../pages/supervisor/SupervisorExamSessionsPage'
import SupervisorMonitorPage from '../pages/supervisor/SupervisorMonitorPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import UnauthorizedPage from '../pages/common/UnauthorizedPage'
import ProtectedRoute from '../routes/ProtectedRoute'

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="groups" element={<AdminGroupsPage />} />
          <Route path="subjects" element={<AdminSubjectsPage />} />
          <Route path="assign" element={<AdminAssignPage />} />
          <Route path="statistics" element={<AdminStatisticsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
        <Route path="/teacher/*" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="passages" element={<PassagesPage />} />
          <Route path="questions" element={<QuestionBankPage />} />
          <Route path="templates" element={<ExamTemplatePage />} />
          <Route path="exams" element={<ExamInstancePage />} />
          <Route path="results" element={<TeacherResultsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route path="/student/*" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="exams" element={<StudentExamListPage />} />
          <Route path="history" element={<StudentHistoryPage />} />
          <Route path="profile" element={<StudentProfilePage />} />
          <Route path="exams/:examId/do" element={<StudentExamTakingPage />} />
          <Route path="exams/:examId/result" element={<StudentExamResultPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['SUPERVISOR']} />}>
        <Route path="/supervisor/*" element={<SupervisorLayout />}>
          <Route index element={<SupervisorDashboard />} />
          <Route path="sessions" element={<SupervisorExamSessionsPage />} />
          <Route path="monitor/:examInstanceId" element={<SupervisorMonitorPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRouter

