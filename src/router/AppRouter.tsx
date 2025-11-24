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
import TeacherPassagesPage from '../pages/teacher/TeacherPassagesPage'
import TeacherQuestionBankPage from '../pages/teacher/TeacherQuestionBankPage'
import TeacherTemplatesPage from '../pages/teacher/TeacherTemplatesPage'
import TeacherInstancesPage from '../pages/teacher/TeacherInstancesPage'
import TeacherResultsPage from '../pages/teacher/TeacherResultsPage'
import StudentDashboard from '../pages/student/StudentDashboard'
import StudentExamListPage from '../pages/student/StudentExamListPage'
import StudentHistoryPage from '../pages/student/StudentHistoryPage'
import StudentProfilePage from '../pages/student/StudentProfilePage'
import StudentExamTakingPage from '../pages/student/StudentExamTakingPage'
import StudentExamResultPage from '../pages/student/StudentExamResultPage'
import SupervisorDashboard from '../pages/supervisor/SupervisorDashboard'
import SupervisorMonitoringPage from '../pages/supervisor/SupervisorMonitoringPage'

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/admin/*" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="groups" element={<AdminGroupsPage />} />
        <Route path="subjects" element={<AdminSubjectsPage />} />
        <Route path="assignments" element={<AdminAssignPage />} />
        <Route path="statistics" element={<AdminStatisticsPage />} />
      </Route>

      <Route path="/teacher/*" element={<TeacherLayout />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="passages" element={<TeacherPassagesPage />} />
        <Route path="questions" element={<TeacherQuestionBankPage />} />
        <Route path="templates" element={<TeacherTemplatesPage />} />
        <Route path="instances" element={<TeacherInstancesPage />} />
        <Route path="results" element={<TeacherResultsPage />} />
      </Route>

      <Route path="/student/*" element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="exams" element={<StudentExamListPage />} />
        <Route path="history" element={<StudentHistoryPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="exams/:examId" element={<StudentExamTakingPage />} />
        <Route path="exams/:examId/result" element={<StudentExamResultPage />} />
      </Route>

      <Route path="/supervisor/*" element={<SupervisorLayout />}>
        <Route index element={<SupervisorDashboard />} />
        <Route path="monitoring" element={<SupervisorMonitoringPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  </BrowserRouter>
)

export default AppRouter

