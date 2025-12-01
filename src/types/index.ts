export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SUPERVISOR'

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export interface User extends AuthUser {
  active: boolean
}

export interface Subject {
  id: number
  name: string
  description?: string
  active: boolean
}

export interface Chapter {
  id: number
  subjectId: number
  name: string
  description?: string
}

export interface QuestionOption {
  id: number
  content: string
  correct: boolean
}

export interface Question {
  id: number
  chapterId: number
  passageId?: number
  content: string
  questionType: 'MCQ' | 'FILL'
  difficulty?: string
  marks: number
  active: boolean
  options: QuestionOption[]
  answers: string[]
}

export interface ExamTemplateStructure {
  id: number
  chapterId: number
  numQuestion: number
}

export interface ExamTemplate {
  id: number
  subjectId: number
  name: string
  totalQuestions: number
  structures: ExamTemplateStructure[]
}

export interface ExamInstanceSupervisor {
  userId: number
  fullName: string
}

export interface ExamInstance {
  id: number
  templateId: number
  studentGroupId: number
  name: string
  startTime: string
  endTime: string
  durationMinutes: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  supervisors: ExamInstanceSupervisor[]
}

export interface ExamAttempt {
  attemptId: number
  examInstanceId: number
  studentId: number
  studentName: string
  startedAt?: string
  submittedAt?: string
  score?: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'BLOCKED'
}

export interface StartAttemptQuestionOption {
  optionId: number
  content: string
}

export interface StartAttemptQuestion {
  questionId: number
  content: string
  questionType: string
  marks: number
  passageId?: number
  passageContent?: string
  options: StartAttemptQuestionOption[]
}

export interface StartAttemptResponse {
  attemptId: number
  examInstanceId: number
  status: string
  startedAt: string
  expiresAt: string
  questions: StartAttemptQuestion[]
}

export interface ExamStatistics {
  averageScore: number
  totalAttempts: number
  completedAttempts: number
  maxScore: number
  scoreDistribution: Record<string, number>
  questionAccuracy: Array<{ questionId: number; content: string; correctRate: number }>
  chapterAccuracy: Array<{ chapterId: number; chapterName: string; correctRate: number }>
}

export interface TeacherPassage {
  id: number
  subjectId: number
  subjectName: string
  chapterId: number
  chapterName: string
  content: string
  createdAt: string
}

export interface TeacherQuestionOption {
  id: number
  content: string
  isCorrect: boolean
}

export interface TeacherQuestion {
  id: number
  subjectId: number
  subjectName: string
  chapterId: number
  chapterName: string
  passageId?: number
  questionType: 'MCQ' | 'FILL'
  difficulty: number
  marks: number
  content: string
  options?: TeacherQuestionOption[]
  answers?: string[]
  createdAt: string
}

export interface TeacherTemplate {
  id: number
  name: string
  subjectId: number
  subjectName: string
  totalQuestions: number
  createdAt: string
  structure: Array<{ chapterId: number; chapterName: string; numQuestion: number }>
}

export interface TeacherExamInstance {
  id: number
  name: string
  templateName: string
  studentGroupName: string
  startTime: string
  endTime: string
  durationMinutes: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED'
}

export interface TeacherExamResult {
  attemptId: number
  studentName: string
  studentEmail: string
  score: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
  submittedAt?: string
}

