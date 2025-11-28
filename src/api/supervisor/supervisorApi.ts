import apiClient from '../axiosClient'
import type { ExamInstanceResponse, ExamAttemptResponse } from '../../types/models'
import { getExamTemplates } from '../examApi'
import dayjs from 'dayjs'

export interface SupervisorSession {
  id: number
  examName: string
  subjectName: string
  studentGroupName: string
  roomNumber?: string
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
  roomNumber?: string
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
  
  if (!instances.data || instances.data.length === 0) {
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
    
    // Find room number from supervisors (get the one matching current supervisor)
    const roomNumber = instance.supervisors.length > 0 ? instance.supervisors[0].roomNumber : undefined

    return {
      id: instance.id,
      examName: instance.name,
      subjectName,
      studentGroupName,
      roomNumber,
      startTime: instance.startTime,
      endTime: instance.endTime,
      status: mapStatus(instance),
    }
  })
}

export const getMonitorData = async (examInstanceId: number): Promise<MonitorData> => {
  // Fetch all exams assigned to supervisor and find the specific one
  const instancesResponse = await apiClient.get<ExamInstanceResponse[]>('/supervisor/exams')
  const instance = instancesResponse.data.find((inst) => inst.id === examInstanceId)
  
  if (!instance) {
    throw new Error(`Không tìm thấy ca thi với ID: ${examInstanceId}`)
  }

  // Fetch attempts for this exam
  const attemptsResponse = await apiClient.get<ExamAttemptResponse[]>(`/exam-attempts/exam/${examInstanceId}`)
  const attempts = attemptsResponse.data

  // Fetch templates, groups, and subjects to map names
  const { getStudentGroups, getSubjects } = await import('../adminApi')
  const [templates, groups] = await Promise.all([
    getExamTemplates(),
    getStudentGroups(),
  ])

  const template = templates.find((t: { id: number }) => t.id === instance.templateId)
  
  // Fetch subjects
  const subjects = await getSubjects()
  const subjectName = template ? subjects.find((s: { id: number; name: string }) => s.id === template.subjectId)?.name ?? 'Chưa xác định' : 'Chưa xác định'
  const studentGroupName = groups.find((g: { id: number; name: string }) => g.id === instance.studentGroupId)?.name ?? `Nhóm #${instance.studentGroupId}`

  // Find room number from supervisors
  const roomNumber = instance.supervisors.length > 0 ? instance.supervisors[0].roomNumber : undefined

  // Fetch student details for attempts
  const { getUsers } = await import('../adminApi')
  const users = await getUsers()
  const studentMap = new Map<number, { name: string; email: string }>()
  users
    .filter((u) => u.role === 'STUDENT')
    .forEach((u) => studentMap.set(u.id, { name: u.fullName, email: u.email }))

  // Map attempts to monitor students
  const students: MonitorStudent[] = attempts.map((attempt) => {
    const student = studentMap.get(attempt.studentId) ?? { name: attempt.studentName || `Sinh viên #${attempt.studentId}`, email: '' }
    
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
      studentName: student.name || attempt.studentName || `Sinh viên #${attempt.studentId}`,
      email: student.email || '',
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
    roomNumber,
    startTime: instance.startTime,
    endTime: instance.endTime,
    students,
  }
}

