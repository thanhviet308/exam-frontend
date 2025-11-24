export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SUPERVISOR'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: UserRole
  userId: number
  fullName: string
}

export interface User {
  id: number
  fullName: string
  email: string
  role: UserRole
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
  durationMinutes: number
  structures: ExamTemplateStructure[]
}

export interface ExamInstanceSupervisor {
  userId: number
  fullName: string
  roomNumber?: string
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

