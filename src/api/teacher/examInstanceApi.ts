import type { TeacherExamInstance } from '../../types'
import { createExamInstance as createExamInstanceApi, getAllExamInstances } from '../examApi'
import type { CreateExamInstanceRequest, ExamInstanceResponse } from '../../types/models'

export type ExamInstancePayload = {
  name: string
  templateId: number
  templateName: string
  studentGroupId: number
  studentGroupName: string
  startTime: string
  endTime: string
  durationMinutes: number
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

const mapStatus = (instance: ExamInstanceResponse): TeacherExamInstance['status'] => {
  const now = new Date()
  const start = new Date(instance.startTime)
  const end = new Date(instance.endTime)

  if (now < start) return 'SCHEDULED'
  if (now >= start && now <= end) return 'ONGOING'
  return 'COMPLETED'
}

const mapInstanceToTeacher = (
  instance: ExamInstanceResponse,
  templateMap?: Map<number, string>,
  groupMap?: Map<number, string>
): TeacherExamInstance => ({
  id: instance.id,
  name: instance.name,
  templateName: templateMap?.get(instance.templateId) ?? `Template #${instance.templateId}`,
  studentGroupName: groupMap?.get(instance.studentGroupId) ?? `Nhóm #${instance.studentGroupId}`,
  startTime: instance.startTime,
  endTime: instance.endTime,
  durationMinutes: instance.durationMinutes,
  shuffleQuestions: instance.shuffleQuestions,
  shuffleOptions: instance.shuffleOptions,
  status: mapStatus(instance),
})

export const fetchExamInstances = async (): Promise<TeacherExamInstance[]> => {
  // Fetch instances, templates, and student groups in parallel
  const [instances, { getExamTemplates }, { getStudentGroups }] = await Promise.all([
    getAllExamInstances(),
    import('../examApi'),
    import('../adminApi'),
  ])

  // Fetch templates and groups to map names
  const templates = await getExamTemplates()
  const groups = await getStudentGroups()

  // Build maps for quick lookup
  const templateMap = new Map<number, string>()
  templates.forEach((t) => templateMap.set(t.id, t.name))

  const groupMap = new Map<number, string>()
  groups.forEach((g) => groupMap.set(g.id, g.name))

  return instances.map((instance) => mapInstanceToTeacher(instance, templateMap, groupMap))
}

export const createExamInstance = async (payload: ExamInstancePayload): Promise<TeacherExamInstance> => {
  const request: CreateExamInstanceRequest = {
    templateId: payload.templateId,
    studentGroupId: payload.studentGroupId,
    name: payload.name,
    startTime: payload.startTime,
    endTime: payload.endTime,
    durationMinutes: payload.durationMinutes,
    shuffleQuestions: payload.shuffleQuestions,
    shuffleOptions: payload.shuffleOptions,
    supervisorIds: [],
  }

  const created = await createExamInstanceApi(request)
  
  // Use provided names from payload since we already have them
  const templateMap = new Map<number, string>()
  templateMap.set(payload.templateId, payload.templateName)
  const groupMap = new Map<number, string>()
  groupMap.set(payload.studentGroupId, payload.studentGroupName)
  
  return mapInstanceToTeacher(created, templateMap, groupMap)
}
