import apiClient from './axiosClient'
import type {
  ExamTemplateResponse,
  CreateExamTemplateRequest,
  UpdateExamTemplateRequest,
  ExamInstanceResponse,
  CreateExamInstanceRequest,
  UpdateExamInstanceRequest,
  StartAttemptResponse,
  ExamAttemptResponse,
  AnswerQuestionRequest,
  SubmitAttemptResponse,
  ExamAttemptDetailResponse,
} from '../types/models'

// Exam Templates API
export const getExamTemplates = async (subjectId?: number): Promise<ExamTemplateResponse[]> => {
  const url = subjectId 
    ? `/exam-templates?subjectId=${subjectId}`
    : '/exam-templates'
  const response = await apiClient.get<ExamTemplateResponse[]>(url)
  return response.data
}

export const getExamTemplate = async (id: number): Promise<ExamTemplateResponse> => {
  const response = await apiClient.get<ExamTemplateResponse>(`/exam-templates/${id}`)
  return response.data
}

export const createExamTemplate = async (request: CreateExamTemplateRequest): Promise<ExamTemplateResponse> => {
  const response = await apiClient.post<ExamTemplateResponse>('/exam-templates', request)
  return response.data
}

export const updateExamTemplate = async (id: number, request: UpdateExamTemplateRequest): Promise<ExamTemplateResponse> => {
  const response = await apiClient.put<ExamTemplateResponse>(`/exam-templates/${id}`, request)
  return response.data
}

// Exam Instances API
export const createExamInstance = async (request: CreateExamInstanceRequest): Promise<ExamInstanceResponse> => {
  const response = await apiClient.post<ExamInstanceResponse>('/exam-instances', request)
  return response.data
}

export const updateExamInstance = async (id: number, request: UpdateExamInstanceRequest): Promise<ExamInstanceResponse> => {
  const response = await apiClient.put<ExamInstanceResponse>(`/exam-instances/${id}`, request)
  return response.data
}

export const getAllExamInstances = async (): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>('/exam-instances')
  return response.data
}

export const getExamInstancesByGroup = async (groupId: number): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>(`/exam-instances/group/${groupId}`)
  return response.data
}

export const assignSupervisorsToExam = async (
  examInstanceId: number,
  supervisors: Array<{ supervisorId: number }>
): Promise<ExamInstanceResponse> => {
  const response = await apiClient.post<ExamInstanceResponse>(
    `/exam-instances/${examInstanceId}/supervisors`,
    supervisors
  )
  return response.data
}

export const getMyExams = async (): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>('/exam-instances/my')
  return response.data
}

export const getAllMyExams = async (): Promise<ExamInstanceResponse[]> => {
  const response = await apiClient.get<ExamInstanceResponse[]>('/exam-instances/my/all')
  return response.data
}

// Exam Attempts API
export const startAttempt = async (examInstanceId: number): Promise<StartAttemptResponse> => {
  const response = await apiClient.post<StartAttemptResponse>(`/exam-attempts/${examInstanceId}/start`)
  return response.data
}

export const answerQuestion = async (
  attemptId: number,
  request: AnswerQuestionRequest,
): Promise<ExamAttemptResponse> => {
  const response = await apiClient.post<ExamAttemptResponse>(`/exam-attempts/${attemptId}/answers`, request)
  return response.data
}

export const submitAttempt = async (attemptId: number): Promise<SubmitAttemptResponse> => {
  const response = await apiClient.post<SubmitAttemptResponse>(`/exam-attempts/${attemptId}/submit`)
  return response.data
}

export const getAttemptsForExam = async (examInstanceId: number): Promise<ExamAttemptResponse[]> => {
  const response = await apiClient.get<ExamAttemptResponse[]>(`/exam-attempts/exam/${examInstanceId}`)
  return response.data
}

export const getMyHistory = async (): Promise<ExamAttemptResponse[]> => {
  const response = await apiClient.get<ExamAttemptResponse[]>('/exam-attempts/history')
  return response.data
}

export const getAttemptDetail = async (attemptId: number): Promise<ExamAttemptDetailResponse> => {
  const response = await apiClient.get<{
    attempt: ExamAttemptResponse
    answers: Array<{
      questionId: number
      content: string
      questionType: string
      marks: number
      selectedOptionId?: number | null
      selectedOptionContent?: string | null
      fillAnswer?: string | null
      correct: boolean
      correctAnswers: string[]
    }>
  }>(`/exam-attempts/${attemptId}`)
  
  // Map backend response to frontend format
  const { attempt, answers } = response.data
  
  // Ensure answers is an array
  const answersArray = Array.isArray(answers) ? answers : []
  
  return {
    attemptId: attempt.attemptId,
    examInstanceId: attempt.examInstanceId,
    studentId: attempt.studentId,
    studentName: attempt.studentName,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    score: attempt.score,
    status: attempt.status,
    questionResults: answersArray.map((answer) => ({
      questionId: answer.questionId,
      content: answer.content,
      isCorrect: answer.correct,
      studentAnswer: answer.selectedOptionContent ?? answer.fillAnswer ?? undefined,
      correctAnswer: answer.correctAnswers?.[0] ?? undefined,
      marks: answer.marks || 0,
      earnedMarks: answer.correct ? (answer.marks || 0) : 0,
    })),
  }
}

