import apiClient from './axiosClient'
import type {
  UserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  SubjectResponse,
  SubjectRequest,
  ChapterResponse,
  ChapterRequest,
  StudentGroupResponse,
  CreateStudentGroupRequest,
  SubjectAssignment,
  CreateSubjectAssignmentRequest,
} from '../types/models'

// Users API
export const getUsers = async (): Promise<UserResponse[]> => {
  const response = await apiClient.get<UserResponse[]>('/users')
  return response.data
}

export const getUsersByRole = async (role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'SUPERVISOR'): Promise<UserResponse[]> => {
  const response = await apiClient.get<UserResponse[]>('/users', { params: { role } })
  return response.data
}

export const getUser = async (id: number): Promise<UserResponse> => {
  const response = await apiClient.get<UserResponse>(`/users/${id}`)
  return response.data
}

export const createUser = async (request: CreateUserRequest): Promise<UserResponse> => {
  const response = await apiClient.post<UserResponse>('/users', request)
  return response.data
}

export const updateUser = async (id: number, request: UpdateUserRequest): Promise<UserResponse> => {
  const response = await apiClient.put<UserResponse>(`/users/${id}`, request)
  return response.data
}

export const deleteUser = async (id: number): Promise<void> => {
  await apiClient.delete(`/users/${id}`)
}

// Subjects API
export const getSubjects = async (): Promise<SubjectResponse[]> => {
  const response = await apiClient.get<SubjectResponse[]>('/subjects')
  return response.data
}

export const createSubject = async (request: SubjectRequest): Promise<SubjectResponse> => {
  const response = await apiClient.post<SubjectResponse>('/subjects', request)
  return response.data
}

export const updateSubject = async (id: number, request: SubjectRequest): Promise<SubjectResponse> => {
  const response = await apiClient.put<SubjectResponse>(`/subjects/${id}`, request)
  return response.data
}

export const deleteSubject = async (id: number): Promise<void> => {
  await apiClient.delete(`/subjects/${id}`)
}

// Chapters API
export const getChapters = async (subjectId: number): Promise<ChapterResponse[]> => {
  const response = await apiClient.get<ChapterResponse[]>(`/subjects/${subjectId}/chapters`)
  return response.data
}

export const createChapter = async (request: ChapterRequest): Promise<ChapterResponse> => {
  const response = await apiClient.post<ChapterResponse>('/subjects/chapters', request)
  return response.data
}

export const updateChapter = async (id: number, request: ChapterRequest): Promise<ChapterResponse> => {
  const response = await apiClient.put<ChapterResponse>(`/subjects/chapters/${id}`, request)
  return response.data
}

// Student Groups API
export const getStudentGroups = async (): Promise<StudentGroupResponse[]> => {
  const response = await apiClient.get<StudentGroupResponse[]>('/student-groups')
  return response.data
}

export const createStudentGroup = async (
  request: CreateStudentGroupRequest,
): Promise<StudentGroupResponse> => {
  const response = await apiClient.post<StudentGroupResponse>('/student-groups', request)
  return response.data
}

export const updateStudentGroup = async (
  id: number,
  request: CreateStudentGroupRequest,
): Promise<StudentGroupResponse> => {
  const response = await apiClient.put<StudentGroupResponse>(`/student-groups/${id}`, request)
  return response.data
}

export const deleteStudentGroup = async (id: number): Promise<void> => {
  await apiClient.delete(`/student-groups/${id}`)
}

// Group - Subject - Teacher assignments
export const getSubjectAssignments = async (): Promise<SubjectAssignment[]> => {
  const response = await apiClient.get<SubjectAssignment[]>('/student-groups/subjects')
  return response.data
}

export const createSubjectAssignment = async (
  request: CreateSubjectAssignmentRequest,
): Promise<SubjectAssignment> => {
  const response = await apiClient.post<SubjectAssignment>('/student-groups/subjects', request)
  return response.data
}

export const deleteSubjectAssignment = async (groupId: number, subjectId: number): Promise<void> => {
  await apiClient.delete('/student-groups/subjects', { params: { groupId, subjectId } })
}

