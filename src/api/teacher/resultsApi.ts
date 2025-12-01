import type { TeacherExamResult } from '../../types'
import { getAttemptsForExam } from '../examApi'
import type { ExamAttemptResponse } from '../../types/models'

const mapAttemptToResult = (attempt: ExamAttemptResponse): TeacherExamResult => {
  // Ensure email is always a string, fallback to empty string if undefined/null
  const email = attempt.studentEmail || ''
  return {
    attemptId: attempt.attemptId,
    studentName: attempt.studentName,
    studentEmail: email,
    score: attempt.score ?? 0,
    status: attempt.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED',
    submittedAt: attempt.submittedAt,
  }
}

export const fetchExamResults = async (examInstanceId: number): Promise<TeacherExamResult[]> => {
  const attempts = await getAttemptsForExam(examInstanceId)
  return attempts.map(mapAttemptToResult)
}
