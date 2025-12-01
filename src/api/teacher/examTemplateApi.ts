import type { TeacherTemplate } from '../../types'
import { createExamTemplate, getExamTemplates, updateExamTemplate } from '../examApi'
import type { CreateExamTemplateRequest, UpdateExamTemplateRequest, ExamTemplateResponse } from '../../types/models'

export type TemplatePayload = {
  name: string
  subjectId: number
  subjectName: string
  totalQuestions: number
}

export type TemplateStructureUpdate = Array<{
  chapterId: number
  chapterName: string
  numQuestion: number
  numBasic: number
  numAdvanced: number
}>

const mapTemplateToTeacher = (
  t: ExamTemplateResponse,
  subjectName?: string,
  chapterMap?: Map<number, string>
): TeacherTemplate => ({
  id: t.id,
  name: t.name,
  subjectId: t.subjectId,
  subjectName: subjectName ?? `Môn #${t.subjectId}`,
  totalQuestions: t.totalQuestions,
  createdAt: new Date().toISOString(),
  structure: t.structures.map((s) => ({
    chapterId: s.chapterId,
    chapterName: chapterMap?.get(s.chapterId) ?? `Chương #${s.chapterId}`,
    numQuestion: s.numQuestion,
    numBasic: s.numBasic ?? 0,
    numAdvanced: s.numAdvanced ?? 0,
  })),
})

export const fetchTemplates = async (): Promise<TeacherTemplate[]> => {
  try {
    // Fetch all templates at once (much faster than fetching per subject)
    const allTemplates = await getExamTemplates()

    if (!allTemplates || allTemplates.length === 0) {
      return []
    }

    // Fetch all subjects and build subject map
    const { getSubjects, getChapters } = await import('../adminApi')
    const subjects = await getSubjects()
    const subjectMap = new Map<number, string>()
    subjects.forEach((s) => subjectMap.set(s.id, s.name))

    // Get unique subject IDs from templates (only fetch chapters for subjects that have templates)
    const uniqueSubjectIds = [...new Set(allTemplates.map((t) => t.subjectId))]

    // Build chapter map only for subjects that have templates
    const chapterMap = new Map<number, string>()
    await Promise.all(
      uniqueSubjectIds.map(async (subjectId) => {
        try {
          const chapters = await getChapters(subjectId)
          chapters.forEach((ch) => {
            chapterMap.set(ch.id, ch.name)
          })
        } catch (error) {
          console.error(`Error fetching chapters for subject ${subjectId}:`, error)
        }
      })
    )

    // Map templates with subject names and chapter names
    return allTemplates.map((t) => {
      const subjectName = subjectMap.get(t.subjectId)
      return mapTemplateToTeacher(t, subjectName, chapterMap)
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    throw new Error(`Không thể tải danh sách khung đề: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const createTemplate = async (
  payload: TemplatePayload,
  structures?: TemplateStructureUpdate,
): Promise<TeacherTemplate> => {
  // If no structures provided, use empty array (will be set later via structure drawer)
  const structureList = structures || []

  const request: CreateExamTemplateRequest = {
    subjectId: payload.subjectId,
    name: payload.name,
    totalQuestions: payload.totalQuestions,
    structures: structureList.map((s) => ({
      chapterId: s.chapterId,
      numQuestion: s.numQuestion,
      numBasic: s.numBasic || 0,
      numAdvanced: s.numAdvanced || 0,
    })),
  }

  const created = await createExamTemplate(request)
  return mapTemplateToTeacher(created, payload.subjectName)
}

export const updateTemplate = async (
  templateId: number,
  payload: TemplatePayload,
  structures?: TemplateStructureUpdate,
): Promise<TeacherTemplate> => {
  // Filter out chapters with 0 or null questions, and ensure numQuestion is a number
  const structureList = (structures || [])
    .filter((s) => s.numQuestion != null && s.numQuestion > 0)
    .map((s) => ({
      chapterId: s.chapterId,
      numQuestion: Number(s.numQuestion) || 0,
      numBasic: Number(s.numBasic) || 0,
      numAdvanced: Number(s.numAdvanced) || 0,
    }))

  // Calculate total from filtered structures to ensure it matches
  const calculatedTotal = structureList.reduce((sum, s) => sum + s.numQuestion, 0)

  const request: UpdateExamTemplateRequest = {
    name: payload.name,
    totalQuestions: calculatedTotal > 0 ? calculatedTotal : payload.totalQuestions,
    structures: structureList.length > 0 ? structureList : [],
  }

  const updated = await updateExamTemplate(templateId, request)

  // Fetch subject name for mapping
  const { getSubjects, getChapters } = await import('../adminApi')
  const subjects = await getSubjects()
  const subjectName = subjects.find(s => s.id === updated.subjectId)?.name

  // Build chapter map
  const chapterMap = new Map<number, string>()
  if (updated.subjectId) {
    try {
      const chapters = await getChapters(updated.subjectId)
      chapters.forEach((ch) => {
        chapterMap.set(ch.id, ch.name)
      })
    } catch (error) {
      console.error(`Error fetching chapters for subject ${updated.subjectId}:`, error)
    }
  }

  return mapTemplateToTeacher(updated, subjectName, chapterMap)
}

export const updateTemplateStructure = async (): Promise<TeacherTemplate> => {
  throw new Error('Cập nhật cấu trúc template hiện chưa được hỗ trợ từ backend')
}
