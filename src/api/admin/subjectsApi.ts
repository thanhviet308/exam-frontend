export interface AdminSubject {
  id: number
  name: string
  description?: string
  active: boolean
  createdAt: string
}

export interface CreateSubjectPayload {
  name: string
  description?: string
  active: boolean
}

let mockSubjects: AdminSubject[] = [
  {
    id: 1,
    name: 'Toán học',
    description: 'Môn toán học cơ bản và nâng cao',
    active: true,
    createdAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 2,
    name: 'Vật lý',
    description: 'Môn vật lý đại cương',
    active: true,
    createdAt: '2025-01-02T09:00:00Z',
  },
  {
    id: 3,
    name: 'Hóa học',
    description: 'Môn hóa học cơ bản',
    active: true,
    createdAt: '2025-01-03T10:00:00Z',
  },
]

export const fetchSubjects = async (): Promise<AdminSubject[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return mockSubjects
}

export const createSubject = async (payload: CreateSubjectPayload): Promise<AdminSubject> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const newSubject: AdminSubject = {
    id: Date.now(),
    name: payload.name,
    description: payload.description,
    active: payload.active,
    createdAt: new Date().toISOString(),
  }
  mockSubjects = [newSubject, ...mockSubjects]
  return newSubject
}

export const updateSubject = async (
  id: number,
  payload: CreateSubjectPayload,
): Promise<AdminSubject> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  mockSubjects = mockSubjects.map((subject) =>
    subject.id === id ? { ...subject, ...payload } : subject,
  )
  return mockSubjects.find((subject) => subject.id === id)!
}

export const deleteSubject = async (id: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200))
  mockSubjects = mockSubjects.filter((subject) => subject.id !== id)
}

export const toggleSubjectActive = async (id: number): Promise<AdminSubject> => {
  await new Promise((resolve) => setTimeout(resolve, 200))
  mockSubjects = mockSubjects.map((subject) =>
    subject.id === id ? { ...subject, active: !subject.active } : subject,
  )
  return mockSubjects.find((subject) => subject.id === id)!
}

