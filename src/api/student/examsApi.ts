import { getMyExams, startAttempt, getAttemptDetail } from '../examApi'
import type { ExamInstanceResponse, StartAttemptResponse, ExamAttemptDetailResponse } from '../../types/models'
import dayjs from 'dayjs'

// Re-export types for compatibility
export type StudentExam = ExamInstanceResponse & {
  subjectName?: string
  status: 'NOT_STARTED' | 'ONGOING' | 'ENDED'
}

export type ExamQuestion = StartAttemptResponse['questions'][0]

export interface ExamDetail {
  examInstanceId: number
  name: string
  subjectName?: string
  startTime: string
  endTime: string
  durationMinutes: number
  expiresAt: string
  questions: ExamQuestion[]
  status: string
}

export interface ExamAnswer {
  questionId: number
  answer?: string // For FILL
  optionId?: number // For MCQ
}

export interface SubmitExamPayload {
  examInstanceId: number
  answers: ExamAnswer[]
}

export type ExamResult = ExamAttemptDetailResponse & {
  totalMarks: number
  correctAnswers: number
  totalQuestions: number
}

// Helper to determine exam status
const getExamStatus = (exam: ExamInstanceResponse): 'NOT_STARTED' | 'ONGOING' | 'ENDED' => {
  const now = dayjs()
  const start = dayjs(exam.startTime)
  const end = dayjs(exam.endTime)
  if (now.isBefore(start)) return 'NOT_STARTED'
  if (now.isAfter(end)) return 'ENDED'
  return 'ONGOING'
}

export const getStudentExams = async (): Promise<StudentExam[]> => {
  const exams = await getMyExams()
  return exams.map((exam) => ({
    ...exam,
    status: getExamStatus(exam),
  }))
}

export const getExamDetailWithQuestions = async (examInstanceId: number): Promise<ExamDetail> => {
  const attemptResponse = await startAttempt(examInstanceId)
  // We need to get exam instance details separately - for now use attempt response
  return {
    examInstanceId: attemptResponse.examInstanceId,
    name: `Exam ${attemptResponse.examInstanceId}`, // Will need to fetch from exam instance
    startTime: '', // Will need to fetch from exam instance
    endTime: '', // Will need to fetch from exam instance
    durationMinutes: 60, // Will need to calculate from expiresAt - startedAt
    expiresAt: attemptResponse.expiresAt,
    questions: attemptResponse.questions,
    status: attemptResponse.status,
  }
}

export const submitExam = async (_payload: SubmitExamPayload): Promise<{ success: boolean; attemptId: number }> => {
  // First, we need to get the attemptId - this should be stored when starting the attempt
  // For now, we'll need to refactor to store attemptId in state
  // This is a limitation - we need to track attemptId from startAttempt
  throw new Error('submitExam requires attemptId. Use submitAttempt from examApi directly with attemptId.')
}

export const getExamResult = async (examInstanceId: number): Promise<ExamResult> => {
  // We need attemptId, not examInstanceId. This needs refactoring.
  // For now, get from history
  try {
    const history = await getMyHistory()
    const attempt = history.find((a) => a.examInstanceId === examInstanceId)
    if (!attempt) {
      throw new Error('Bạn chưa nộp bài thi này hoặc không tìm thấy kết quả.')
    }
    
    // Only get detail if attempt is submitted or graded
    if (attempt.status !== 'SUBMITTED' && attempt.status !== 'GRADED') {
      throw new Error('Bài thi này chưa được nộp.')
    }
    
    const detail = await getAttemptDetail(attempt.attemptId)
    
    // Ensure questionResults is an array
    const questionResults = detail.questionResults || []
    
    return {
      ...detail,
      questionResults,
      totalMarks: questionResults.reduce((sum, q) => sum + (q.marks || 0), 0),
      correctAnswers: questionResults.filter((q) => q.isCorrect).length,
      totalQuestions: questionResults.length,
    }
  } catch (error) {
    // Re-throw with a more user-friendly message
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Có lỗi xảy ra khi tải kết quả bài thi.')
  }
}

// Re-export for convenience
import { getMyHistory } from '../examApi'
export { getMyHistory }

