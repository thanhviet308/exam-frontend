import apiClient from '../axiosClient'
import type { ExamInstanceResponse, ExamAttemptResponse } from '../../types/models'
import { getExamTemplates } from '../examApi'
import dayjs from 'dayjs'

export interface SupervisorSession {
  id: number
  examName: string
  subjectName: string
  studentGroupName: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED'
}

export interface MonitorStudent {
  studentId: number
  studentName: string
  email: string
  status: 'NOT_STARTED' | 'DOING' | 'SUBMITTED'
  startedAt?: string
  submittedAt?: string
  timeSpent?: number // seconds
}

export interface MonitorData {
  examInstanceId: number
  examName: string
  subjectName: string
  studentGroupName: string
  startTime: string
  endTime: string
  students: MonitorStudent[]
}

const mapStatus = (instance: ExamInstanceResponse): SupervisorSession['status'] => {
  const now = dayjs()
  const start = dayjs(instance.startTime)
  const end = dayjs(instance.endTime)

  if (now.isBefore(start)) return 'SCHEDULED'
  if (now.isAfter(end)) return 'COMPLETED'
  return 'ONGOING'
}

const mapAttemptStatus = (attempt: ExamAttemptResponse): MonitorStudent['status'] => {
  if (attempt.status === 'NOT_STARTED') return 'NOT_STARTED'
  if (attempt.status === 'IN_PROGRESS') return 'DOING'
  if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') return 'SUBMITTED'
  return 'NOT_STARTED'
}

export const getSupervisorSessions = async (): Promise<SupervisorSession[]> => {
  // Fetch exams assigned to supervisor
  const instances = await apiClient.get<ExamInstanceResponse[]>('/supervisor/exams')
  
  // Debug logging
  console.log('[SupervisorSessions] Fetched instances:', instances.data)
  
  if (!instances.data || instances.data.length === 0) {
    console.log('[SupervisorSessions] No instances found')
    return []
  }

  // Fetch templates and groups to map names
  const { getStudentGroups } = await import('../adminApi')
  const [templates, groups] = await Promise.all([
    getExamTemplates(),
    getStudentGroups(),
  ])

  // Build maps for quick lookup
  const templateMap = new Map<number, { subjectId: number; name: string }>()
  templates.forEach((t: { id: number; subjectId: number; name: string }) => templateMap.set(t.id, { subjectId: t.subjectId, name: t.name }))

  const groupMap = new Map<number, string>()
  groups.forEach((g: { id: number; name: string }) => groupMap.set(g.id, g.name))

  // Fetch subjects for templates
  const { getSubjects } = await import('../adminApi')
  const subjects = await getSubjects()
  const subjectMap = new Map<number, string>()
  subjects.forEach((s: { id: number; name: string }) => subjectMap.set(s.id, s.name))

  // Map instances to sessions
  return instances.data.map((instance) => {
    const template = templateMap.get(instance.templateId)
    const subjectName = template ? subjectMap.get(template.subjectId) ?? 'Chưa xác định' : 'Chưa xác định'
    const studentGroupName = groupMap.get(instance.studentGroupId) ?? `Nhóm #${instance.studentGroupId}`
    
    return {
      id: instance.id,
      examName: instance.name,
      subjectName,
      studentGroupName,
      startTime: instance.startTime,
      endTime: instance.endTime,
      status: mapStatus(instance),
    }
  })
}

export interface SupervisorStatistics {
  totalSessions: number
  scheduledSessions: number
  ongoingSessions: number
  completedSessions: number
  totalStudents: number
  completedAttempts: number
  totalViolations: number
  violationsByType: Record<string, number>
  recentSessions: Array<{
    examInstanceId: number
    examName: string
    subjectName: string
    studentGroupName: string
    startTime: string
    endTime: string
    status: string
    totalStudents: number
    completedStudents: number
    violationsCount: number
  }>
  studentViolations: Array<{
    studentId: number
    studentName: string
    examInstanceId: number
    examName: string
    subjectName: string
    studentGroupName: string
    totalViolations: number
    violationsByType: Record<string, number>
    lastViolationTime: string
  }>
}

export const getSupervisorStatistics = async (): Promise<SupervisorStatistics> => {
  const response = await apiClient.get<SupervisorStatistics>('/supervisor/statistics')
  return response.data
}

export const getMonitorData = async (examInstanceId: number): Promise<MonitorData> => {
  // Fetch instance and attempts in parallel
  const { getStudentGroups } = await import('../adminApi')
  
  const [instancesResponse, attemptsResponse, groups] = await Promise.all([
    apiClient.get<ExamInstanceResponse[]>('/supervisor/exams'),
    apiClient.get<ExamAttemptResponse[]>(`/exam-attempts/exam/${examInstanceId}`),
    getStudentGroups(),
  ])
  
  const instance = instancesResponse.data.find((inst) => inst.id === examInstanceId)
  
  if (!instance) {
    throw new Error(`Không tìm thấy ca thi với ID: ${examInstanceId}`)
  }

  const attempts = attemptsResponse.data
  
  // Use subjectName from instance (already included in response)
  const subjectName = instance.subjectName || 'Chưa xác định'
  const studentGroupName = groups.find((g: { id: number; name: string }) => g.id === instance.studentGroupId)?.name ?? `Nhóm #${instance.studentGroupId}`

  // Map attempts to monitor students - use data from attempt response directly
  const students: MonitorStudent[] = attempts.map((attempt) => {
    // Calculate time spent in seconds
    let timeSpent: number | undefined
    const startedAt = attempt.startedAt || null
    const submittedAt = attempt.submittedAt || null
    
    if (startedAt) {
      const started = dayjs(startedAt)
      const ended = submittedAt ? dayjs(submittedAt) : dayjs()
      timeSpent = ended.diff(started, 'second')
    }

    return {
      studentId: attempt.studentId,
      studentName: attempt.studentName || `Sinh viên #${attempt.studentId}`,
      email: attempt.studentEmail || '',
      status: mapAttemptStatus(attempt),
      startedAt: startedAt || undefined,
      submittedAt: submittedAt || undefined,
      timeSpent,
    }
  })

  return {
    examInstanceId: instance.id,
    examName: instance.name,
    subjectName,
    studentGroupName,
    startTime: instance.startTime,
    endTime: instance.endTime,
    students,
  }
}

