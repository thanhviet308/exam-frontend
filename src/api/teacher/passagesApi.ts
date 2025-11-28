import type { TeacherPassage } from '../../types'
import { getPassages as getPassagesApi, createPassage as createPassageApi, updatePassage as updatePassageApi, deletePassage as deletePassageApi } from '../questionApi'
import { getChapters, getSubjects } from '../adminApi'
import type { PassageRequest } from '../../types/models'

export type PassageFilter = {
  subjectId?: number
  chapterId?: number
}

export type PassagePayload = {
  subjectId: number
  subjectName: string
  chapterId: number
  chapterName: string
  content: string
}

export const fetchPassages = async (filter: PassageFilter): Promise<TeacherPassage[]> => {
  if (!filter.subjectId || !filter.chapterId) {
    return []
  }

  const [subjects, chapters, backendPassages] = await Promise.all([
    getSubjects(),
    getChapters(filter.subjectId),
    getPassagesApi(filter.chapterId),
  ])

  const subject = subjects.find((s) => s.id === filter.subjectId)
  const chapter = chapters.find((c) => c.id === filter.chapterId)

  return backendPassages.map<TeacherPassage>((p) => ({
    id: p.id,
    subjectId: filter.subjectId!,
    subjectName: subject?.name ?? 'Chưa xác định',
    chapterId: p.chapterId,
    chapterName: chapter?.name ?? 'Chưa xác định',
    content: p.content,
    createdAt: new Date().toISOString(),
  }))
}

export const createPassage = async (payload: PassagePayload): Promise<TeacherPassage> => {
  const request: PassageRequest = {
    chapterId: payload.chapterId,
    content: payload.content,
  }
  const created = await createPassageApi(request)

  return {
    id: created.id,
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    chapterId: created.chapterId,
    chapterName: payload.chapterName,
    content: created.content,
    createdAt: new Date().toISOString(),
  }
}

export const updatePassage = async (id: number, payload: PassagePayload): Promise<TeacherPassage> => {
  const request: PassageRequest = {
    chapterId: payload.chapterId,
    content: payload.content,
  }
  const updated = await updatePassageApi(id, request)

  return {
    id: updated.id,
    subjectId: payload.subjectId,
    subjectName: payload.subjectName,
    chapterId: updated.chapterId,
    chapterName: payload.chapterName,
    content: updated.content,
    createdAt: new Date().toISOString(),
  }
}

export const deletePassage = async (id: number): Promise<void> => {
  await deletePassageApi(id)
}
