# API Integration Status

## ✅ Completed

### 1. API Infrastructure
- ✅ Created `src/api/axiosClient.ts` with baseURL `http://localhost:8081/api` and JWT interceptor
- ✅ Created `src/types/models.ts` with TypeScript interfaces matching backend DTOs
- ✅ Created API files:
  - `src/api/authApi.ts` - Login, refresh token
  - `src/api/adminApi.ts` - Users, Subjects, Chapters
  - `src/api/questionApi.ts` - Questions, Passages
  - `src/api/examApi.ts` - Templates, Instances, Attempts
  - `src/api/studentApi.ts` - Student exam operations
  - `src/api/supervisorApi.ts` - Supervisor operations

### 2. Authentication
- ✅ Updated `AuthContext.tsx` to use real API (`authApi.login`)
- ✅ Updated `LoginPage.tsx` - Already using AuthContext (no changes needed)
- ✅ Token storage: `accessToken` and `refreshToken` in localStorage
- ✅ Axios interceptor automatically adds `Authorization: Bearer <token>` header

### 3. Refactored Pages
- ✅ `AdminUsersPage.tsx` - Uses `getUsers`, `createUser`, `updateUser` from `adminApi`
- ✅ `StudentExamListPage.tsx` - Uses `getStudentExams` (wraps `getMyExams` from `examApi`)
- ✅ `StudentExamTakingPage.tsx` - Uses `startAttempt` and `submitAttempt` from `examApi`

## ⚠️ Partially Completed / Needs Work

### 1. Student Module
- ⚠️ `StudentExamResultPage.tsx` - Needs to use `getAttemptDetail` from `examApi`
  - Current: Uses mock `getExamResult`
  - Required: Use `getAttemptDetail(attemptId)` - need to track attemptId

### 2. Teacher Module
- ❌ `PassagesPage.tsx` - Still uses mock API
  - Should use: `getPassages`, `createPassage`, `updatePassage` from `questionApi`
- ❌ `QuestionBankPage.tsx` - Still uses mock API
  - Should use: `getQuestions`, `createQuestion`, `updateQuestion`, `deleteQuestion` from `questionApi`
- ❌ `ExamTemplatePage.tsx` - Still uses mock API
  - Should use: `getExamTemplates`, `createExamTemplate` from `examApi`
- ❌ `ExamInstancePage.tsx` - Still uses mock API
  - Should use: `createExamInstance`, `getExamInstancesByGroup` from `examApi`
- ❌ `TeacherResultsPage.tsx` - Still uses mock API
  - Should use: `getAttemptsForExam` from `examApi`

### 3. Admin Module
- ❌ `AdminSubjectsPage.tsx` - Still uses mock API
  - Should use: `getSubjects`, `createSubject`, `updateSubject` from `adminApi`
- ❌ `AdminGroupsPage.tsx` - Still uses mock API
  - **Note**: Backend doesn't have Student Groups controller yet - keep mock for now
- ❌ `AdminAssignPage.tsx` - Still uses mock API
  - **Note**: Backend doesn't have Assignment controller yet - keep mock for now
- ❌ `AdminDashboard.tsx` - Still uses mock data
  - Should fetch real statistics from backend (if available)

### 4. Supervisor Module
- ❌ `SupervisorDashboard.tsx` - Still uses mock data
- ❌ `SupervisorMonitoringPage.tsx` - Still uses mock API
  - Should use: `getSupervisorExams`, `getSupervisorAttempts` from `supervisorApi`

## 📝 Notes

### Backend Endpoints Mapping

| Frontend API | Backend Endpoint | Method | Status |
|-------------|------------------|--------|--------|
| `login` | `/api/auth/login` | POST | ✅ |
| `getUsers` | `/api/users` | GET | ✅ |
| `createUser` | `/api/users` | POST | ✅ |
| `updateUser` | `/api/users/{id}` | PUT | ✅ |
| `getSubjects` | `/api/subjects` | GET | ✅ |
| `getChapters` | `/api/subjects/{id}/chapters` | GET | ✅ |
| `getQuestions` | `/api/questions?subjectId=&chapterId=...` | GET | ✅ |
| `createQuestion` | `/api/questions` | POST | ✅ |
| `getPassages` | `/api/subjects/chapters/{id}/passages` | GET | ✅ |
| `getExamTemplates` | `/api/exam-templates?subjectId=` | GET | ✅ |
| `createExamInstance` | `/api/exam-instances` | POST | ✅ |
| `getMyExams` | `/api/exam-instances/my` | GET | ✅ |
| `startAttempt` | `/api/exam-attempts/{examInstanceId}/start` | POST | ✅ |
| `submitAttempt` | `/api/exam-attempts/{attemptId}/submit` | POST | ✅ |
| `getAttemptDetail` | `/api/exam-attempts/{attemptId}` | GET | ✅ |
| `getSupervisorExams` | `/api/supervisor/exams` | GET | ✅ |

### Missing Backend Endpoints
- Student Groups CRUD - No controller found
- Subject-to-Group Assignment - No controller found
- Statistics/Dashboard - Only exam statistics endpoint exists

### Important Changes Needed

1. **StudentExamResultPage**: 
   - Currently expects `examInstanceId` but backend needs `attemptId`
   - Solution: Store `attemptId` in navigation state or URL params when submitting

2. **QuestionBankPage**:
   - Needs to fetch subjects and chapters first to populate filters
   - Use `getSubjects()` and `getChapters(subjectId)` from `adminApi`

3. **PassagesPage**:
   - Needs to fetch chapters first
   - Use `getChapters(subjectId)` from `adminApi`

4. **ExamTemplatePage**:
   - Needs subjectId to fetch templates
   - Use `getExamTemplates(subjectId)` from `examApi`

5. **ExamInstancePage**:
   - Needs to fetch templates and groups (groups API missing)
   - Use `getExamTemplates(subjectId)` and mock groups for now

## 🔄 Next Steps

1. Refactor remaining Teacher pages (Passages, QuestionBank, Templates, Instances, Results)
2. Refactor remaining Admin pages (Subjects, Dashboard)
3. Refactor Supervisor pages
4. Fix StudentExamResultPage to use attemptId
5. Add error handling and loading states consistently
6. Test all API integrations with real backend

## 🐛 Known Issues

1. `StudentExamListPage` - `subjectName` not in `ExamInstanceResponse` - need to fetch from template
2. `StudentExamResultPage` - Needs attemptId, not examInstanceId
3. Student Groups and Assignments - No backend endpoints yet

