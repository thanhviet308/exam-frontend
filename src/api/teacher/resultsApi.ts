import type { TeacherExamResult } from '../../types'
import { getAttemptsForExam } from '../examApi'
import type { ExamAttemptResponse } from '../../types/models'

const mapAttemptToResult = (attempt: ExamAttemptResponse): TeacherExamResult => ({
  attemptId: attempt.attemptId,
  studentName: attempt.studentName,
  studentEmail: `student#${attempt.studentId}`,
  score: attempt.score ?? 0,
  status: attempt.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED',
  submittedAt: attempt.submittedAt,
})

export const fetchExamResults = async (examInstanceId: number): Promise<TeacherExamResult[]> => {
  const attempts = await getAttemptsForExam(examInstanceId)
  return attempts.map(mapAttemptToResult)
}
