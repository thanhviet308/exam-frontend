import type { TeacherQuestion } from '../../types'
import {
  getQuestions as getQuestionsApi,
  createQuestion as createQuestionApi,
  updateQuestion as updateQuestionApi,
  deleteQuestion as deleteQuestionApi,
} from '../questionApi'
import { getChapters, getSubjects } from '../adminApi'
import type {
  CreateQuestionRequest,
  QuestionFilterRequest,
  QuestionResponse,
  QuestionType,
} from '../../types/models'

export type QuestionFilter = {
  subjectId?: number
  chapterId?: number
  questionType?: 'MCQ' | 'FILL'
  difficulty?: 'BASIC' | 'ADVANCED'
}

export type QuestionPayload = Omit<TeacherQuestion, 'id' | 'createdAt' | 'subjectName' | 'chapterName'> & {
  subjectName?: string
  chapterName?: string
}

const mapDifficultyToLevel = (difficulty?: string | null): string => {
  if (!difficulty) return 'BASIC'
  const normalized = difficulty.toUpperCase()
  if (normalized === 'ADVANCED' || normalized === 'NÂNG CAO') return 'ADVANCED'
  return 'BASIC' // Mặc định là cơ bản
}

const mapQuestionToTeacher = (
  q: QuestionResponse,
  subjectId?: number,
  subjectName?: string,
  chapterName?: string,
): TeacherQuestion => ({
  id: q.id,
  subjectId: subjectId ?? 0,
  subjectName: subjectName ?? 'Chưa xác định',
  chapterId: q.chapterId,
  chapterName: chapterName ?? 'Chưa xác định',
  questionType: q.questionType as QuestionType,
  difficulty: mapDifficultyToLevel(q.difficulty),
  marks: q.marks,
  content: q.content,
  options: q.options?.map((opt) => ({
    id: opt.id,
    content: opt.content,
    isCorrect: opt.correct,
  })),
  answers: q.answers ?? [],
  createdAt: new Date().toISOString(),
})

export const fetchQuestions = async (filter: QuestionFilter): Promise<TeacherQuestion[]> => {
  const backendFilter: QuestionFilterRequest = {
    subjectId: filter.subjectId,
    chapterId: filter.chapterId,
    questionType: filter.questionType as QuestionType | undefined,
  }

  // Always fetch all subjects and chapters to map names correctly
  const [backendQuestions, allSubjects] = await Promise.all([
    getQuestionsApi(backendFilter),
    getSubjects(),
  ])

  // Fetch all chapters for all subjects
  const allChaptersMap = new Map<number, { subjectId: number; subjectName: string; chapterName: string }>()
  await Promise.all(
    allSubjects.map(async (subject) => {
      try {
        const chapters = await getChapters(subject.id)
        chapters.forEach((ch) => {
          allChaptersMap.set(ch.id, { subjectId: subject.id, subjectName: subject.name, chapterName: ch.name })
        })
      } catch (error) {
        console.error(`Error fetching chapters for subject ${subject.id}:`, error)
      }
    })
  )

  return backendQuestions.map((q) => {
    const chapterInfo = allChaptersMap.get(q.chapterId)
    return mapQuestionToTeacher(
      q,
      chapterInfo?.subjectId,
      chapterInfo?.subjectName,
      chapterInfo?.chapterName
    )
  })
}

export const createQuestion = async (payload: QuestionPayload): Promise<TeacherQuestion> => {
  const request: CreateQuestionRequest = {
    chapterId: payload.chapterId,
    passageId: payload.passageId,
    content: payload.content,
    questionType: payload.questionType as QuestionType,
    difficulty: undefined,
    marks: undefined, // Không gửi marks, backend sẽ set mặc định là 1
    active: true,
    options: payload.questionType === 'MCQ'
      ? payload.options?.map((opt) => ({
        content: opt.content,
        correct: opt.isCorrect,
      }))
      : undefined,
    answers: payload.questionType === 'FILL'
      ? payload.answers?.map((answer) => ({ answer }))
      : undefined,
  }

  const created = await createQuestionApi(request)
  return mapQuestionToTeacher(created, payload.subjectId, payload.subjectName, payload.chapterName)
}

export const updateQuestion = async (id: number, payload: QuestionPayload): Promise<TeacherQuestion> => {
  const request: CreateQuestionRequest = {
    chapterId: payload.chapterId,
    passageId: payload.passageId,
    content: payload.content,
    questionType: payload.questionType as QuestionType,
    difficulty: undefined,
    marks: undefined, // Không gửi marks, backend sẽ set mặc định là 1
    active: true,
    options: payload.questionType === 'MCQ'
      ? payload.options?.map((opt) => ({
        content: opt.content,
        correct: opt.isCorrect,
      }))
      : undefined,
    answers: payload.questionType === 'FILL'
      ? payload.answers?.map((answer) => ({ answer }))
      : undefined,
  }

  const updated = await updateQuestionApi(id, request)
  return mapQuestionToTeacher(updated, payload.subjectId, payload.subjectName, payload.chapterName)
}

export const deleteQuestion = async (id: number): Promise<void> => {
  await deleteQuestionApi(id)
}

export const bulkCreateQuestions = async (
  requests: CreateQuestionRequest[],
): Promise<{ created: TeacherQuestion[]; duplicates: any[]; totalProcessed: number; totalCreated: number; totalDuplicates: number }> => {
  const { bulkCreateQuestions: bulkCreateQuestionsApi } = await import('../questionApi')
  const response = await bulkCreateQuestionsApi(requests)
  
  // Fetch subjects and chapters to map correctly
  const subjects = await getSubjects()
  const allChaptersMap = new Map<number, { subjectName: string; chapterName: string }>()

  await Promise.all(
    subjects.map(async (subject) => {
      try {
        const chapters = await getChapters(subject.id)
        chapters.forEach((ch) => {
          allChaptersMap.set(ch.id, { subjectName: subject.name, chapterName: ch.name })
        })
      } catch (error) {
        console.error(`Error fetching chapters for subject ${subject.id}:`, error)
      }
    })
  )

  const created = response.created.map((q) => {
    const chapterInfo = allChaptersMap.get(q.chapterId)
    const subject = subjects.find((s) => {
      const chInfo = allChaptersMap.get(q.chapterId)
      return chInfo?.subjectName === s.name
    })

    return {
      id: q.id,
      subjectId: subject?.id ?? 0,
      subjectName: chapterInfo?.subjectName ?? '',
      chapterId: q.chapterId,
      chapterName: chapterInfo?.chapterName ?? '',
      questionType: q.questionType as 'MCQ' | 'FILL',
      difficulty: mapDifficultyToLevel(q.difficulty),
      marks: q.marks,
      content: q.content,
      options: q.options?.map((opt) => ({
        id: opt.id,
        content: opt.content,
        isCorrect: opt.correct,
      })),
      answers: q.answers ?? [],
      createdAt: new Date().toISOString(),
    }
  })

  return {
    created,
    duplicates: response.duplicates,
    totalProcessed: response.totalProcessed,
    totalCreated: response.totalCreated,
    totalDuplicates: response.totalDuplicates,
  }
}
