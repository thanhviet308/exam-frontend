import apiClient from './axiosClient'
import type { ExamInstanceResponse } from '../types/models'

// Re-export from examApi for convenience
export { getMyExams, startAttempt, answerQuestion, submitAttempt, getMyHistory, getAttemptDetail } from './examApi'

// Student-specific exam list (already in examApi as getMyExams)
export const getStudentExams = async (): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>('/exam-instances/my')
  return response.data
}

