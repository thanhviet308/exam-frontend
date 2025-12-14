import apiClient from './axiosClient'
import type {
  BulkCreateQuestionResponse,
  QuestionResponse,
  CreateQuestionRequest,
  QuestionFilterRequest,
  PassageResponse,
  PassageRequest,
} from '../types/models'

// Questions API
export const getQuestions = async (filter?: QuestionFilterRequest): Promise<QuestionResponse[]> => {
  const params = new URLSearchParams()
  if (filter?.subjectId) params.append('subjectId', filter.subjectId.toString())
  if (filter?.chapterId) params.append('chapterId', filter.chapterId.toString())
  if (filter?.difficulty) params.append('difficulty', filter.difficulty)
  if (filter?.createdBy) params.append('createdBy', filter.createdBy.toString())
  if (filter?.hasPassage !== undefined) params.append('hasPassage', filter.hasPassage.toString())
  if (filter?.questionType) params.append('questionType', filter.questionType)

  const response = await apiClient.get<QuestionResponse[]>(`/questions?${params.toString()}`)
  return response.data
}

export const createQuestion = async (request: CreateQuestionRequest): Promise<QuestionResponse> => {
  const response = await apiClient.post<QuestionResponse>('/questions', request)
  return response.data
}

export const updateQuestion = async (id: number, request: CreateQuestionRequest): Promise<QuestionResponse> => {
  const response = await apiClient.put<QuestionResponse>(`/questions/${id}`, request)
  return response.data
}

export const deleteQuestion = async (id: number): Promise<void> => {
  await apiClient.delete(`/questions/${id}`)
}

export const bulkCreateQuestions = async (requests: CreateQuestionRequest[]): Promise<BulkCreateQuestionResponse> => {
  const response = await apiClient.post<BulkCreateQuestionResponse>('/questions/bulk', requests)
  return response.data
}

// Passages API
export const getPassages = async (chapterId: number): Promise<PassageResponse[]> => {
  const response = await apiClient.get<PassageResponse[]>(`/subjects/chapters/${chapterId}/passages`)
  return response.data
}

export const createPassage = async (request: PassageRequest): Promise<PassageResponse> => {
  const response = await apiClient.post<PassageResponse>('/subjects/passages', request)
  return response.data
}

export const updatePassage = async (id: number, request: PassageRequest): Promise<PassageResponse> => {
  const response = await apiClient.put<PassageResponse>(`/subjects/passages/${id}`, request)
  return response.data
}

export const deletePassage = async (id: number): Promise<void> => {
  await apiClient.delete(`/subjects/passages/${id}`)
}

