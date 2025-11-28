import type { TeacherTemplate } from '../../types'
import { createExamTemplate, getExamTemplates } from '../examApi'
import type { CreateExamTemplateRequest, ExamTemplateResponse } from '../../types/models'

export type TemplatePayload = {
  name: string
  subjectId: number
  subjectName: string
  totalQuestions: number
  durationMinutes: number
}

export type TemplateStructureUpdate = Array<{ chapterId: number; chapterName: string; numQuestion: number }>

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
  durationMinutes: t.durationMinutes,
  createdAt: new Date().toISOString(),
  structure: t.structures.map((s) => ({
    chapterId: s.chapterId,
    chapterName: chapterMap?.get(s.chapterId) ?? `Chương #${s.chapterId}`,
    numQuestion: s.numQuestion,
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
    durationMinutes: payload.durationMinutes,
    structures: structureList.map((s) => ({
      chapterId: s.chapterId,
      numQuestion: s.numQuestion,
    })),
  }

  const created = await createExamTemplate(request)
  return mapTemplateToTeacher(created, payload.subjectName)
}

export const updateTemplateStructure = async (): Promise<TeacherTemplate> => {
  throw new Error('Cập nhật cấu trúc template hiện chưa được hỗ trợ từ backend')
}
