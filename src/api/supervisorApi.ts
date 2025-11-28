import apiClient from './axiosClient'
import type { ExamInstanceResponse, ExamAttemptResponse } from '../types/models'

export const getSupervisorExams = async (): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>('/supervisor/exams')
  return response.data
}

export const getSupervisorAttempts = async (): Promise<ExamAttemptResponse[]> => {
  const response = await apiClient.get<ExamAttemptResponse[]>('/supervisor/exams/attempts')
  return response.data
}

// Get attempts for a specific exam instance (for monitoring)
export const getExamAttempts = async (examInstanceId: number): Promise<ExamAttemptResponse[]> => {
  const response = await apiClient.get<ExamAttemptResponse[]>(`/exam-attempts/exam/${examInstanceId}`)
  return response.data
}

