// Auth types
export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SUPERVISOR'

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: UserRole
  userId: number
  fullName: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// User types
export interface UserResponse {
  id: number
  fullName: string
  email: string
  role: UserRole
  active: boolean
}

export interface CreateUserRequest {
  fullName: string
  email: string
  password: string
  role: UserRole
  active: boolean
}

export interface UpdateUserRequest {
  fullName?: string
  email?: string
  role?: UserRole
  active?: boolean
  newPassword?: string
}

// Subject types
export interface SubjectResponse {
  id: number
  name: string
  description?: string
  active: boolean
  createdAt?: string
}

export interface SubjectRequest {
  name: string
  description?: string
  active: boolean
}

export interface ChapterResponse {
  id: number
  subjectId: number
  name: string
  description?: string
}

export interface ChapterRequest {
  subjectId: number
  name: string
  description?: string
}

export interface PassageResponse {
  id: number
  chapterId: number
  content: string
}

export interface PassageRequest {
  chapterId: number
  content: string
}

// Question types
export type QuestionType = 'MCQ' | 'FILL'

export interface QuestionOptionPayload {
  id: number
  content: string
  correct: boolean
}

export interface QuestionResponse {
  id: number
  chapterId: number
  passageId?: number
  content: string
  questionType: QuestionType
  difficulty?: string
  marks: number
  active: boolean
  options?: QuestionOptionPayload[]
  answers?: string[]
}

export interface QuestionOptionRequest {
  content: string
  correct: boolean
}

export interface QuestionAnswerRequest {
  answer: string
}

export interface CreateQuestionRequest {
  chapterId: number
  passageId?: number
  content: string
  questionType: QuestionType
  difficulty?: string
  active: boolean
  options?: QuestionOptionRequest[]
  answers?: QuestionAnswerRequest[]
}

export interface QuestionFilterRequest {
  subjectId?: number
  chapterId?: number
  difficulty?: string
  createdBy?: number
  hasPassage?: boolean
  questionType?: QuestionType
}

// Exam Template types
export interface ExamStructurePayload {
  id: number
  chapterId: number
  numQuestion: number
  numBasic: number
  numAdvanced: number
}

export interface ExamTemplateResponse {
  id: number
  subjectId: number
  name: string
  totalQuestions: number
  structures: ExamStructurePayload[]
}

export interface ExamStructureRequest {
  chapterId: number
  numQuestion: number
  numBasic: number
  numAdvanced: number
}

export interface CreateExamTemplateRequest {
  subjectId: number
  name: string
  totalQuestions: number
  structures: ExamStructureRequest[]
}

export interface UpdateExamTemplateRequest {
  name: string
  totalQuestions: number
  structures: ExamStructureRequest[]
}

// Exam Instance types
export interface SupervisorPayload {
  userId: number
  fullName: string
}

export interface ExamInstanceResponse {
  id: number
  templateId: number
  studentGroupId: number
  name: string
  subjectName: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  supervisors: SupervisorPayload[]
}

export interface CreateExamInstanceRequest {
  templateId: number
  studentGroupId: number
  name: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  supervisors: Array<{ supervisorId: number }>
}

export interface UpdateExamInstanceRequest {
  templateId: number
  studentGroupId: number
  name: string
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  supervisors: Array<{ supervisorId: number }>
}

// Exam Attempt types
export type ExamAttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'BLOCKED'

export interface ExamAttemptResponse {
  attemptId: number
  examInstanceId: number
  studentId: number
  studentName: string
  studentEmail: string
  startedAt?: string
  submittedAt?: string
  score?: number
  status: ExamAttemptStatus
}

export interface OptionView {
  optionId: number
  content: string
}

export interface ExamQuestionView {
  questionId: number
  content: string
  questionType: string
  marks: number
  passageId?: number
  passageContent?: string
  options: OptionView[]
}

export interface StartAttemptResponse {
  attemptId: number
  examInstanceId: number
  status: ExamAttemptStatus
  startedAt: string
  expiresAt: string
  questions: ExamQuestionView[]
}

export interface AnswerQuestionRequest {
  questionId: number
  optionId?: number
  answer?: string
}

export interface SubmitAttemptResponse {
  attemptId: number
  score: number
  submittedAt: string
}

export interface ExamAttemptDetailResponse {
  attemptId: number
  examInstanceId: number
  studentId: number
  studentName: string
  startedAt: string
  submittedAt?: string
  score?: number
  status: ExamAttemptStatus
  questionResults: Array<{
    questionId: number
    content: string
    isCorrect: boolean
    studentAnswer?: string | number
    correctAnswer?: string | number
    marks: number
    earnedMarks: number
  }>
}

// Student Group types (if exists in backend)
export interface StudentGroupResponse {
  id: number
  name: string
  createdAt?: string
  numberOfStudents?: number
}

export interface CreateStudentGroupRequest {
  name: string
}

// Subject assignment (group - subject - teacher)
export interface SubjectAssignment {
  groupId: number
  groupName: string
  subjectId: number
  subjectName: string
  teacherId: number
  teacherName: string
  assignedAt: string
}

export interface CreateSubjectAssignmentRequest {
  groupId: number
  subjectId: number
  teacherId: number
}

