export interface SubjectAssignment {
  id: number
  groupId: number
  groupName: string
  subjectId: number
  subjectName: string
  teacherId: number
  teacherName: string
  createdAt: string
}

export interface CreateAssignmentPayload {
  groupId: number
  subjectId: number
  teacherId: number
}

let mockAssignments: SubjectAssignment[] = [
  {
    id: 1,
    groupId: 1,
    groupName: '10A1',
    subjectId: 1,
    subjectName: 'Toán học',
    teacherId: 2,
    teacherName: 'Teacher One',
    createdAt: '2025-01-10T08:00:00Z',
  },
  {
    id: 2,
    groupId: 1,
    groupName: '10A1',
    subjectId: 2,
    subjectName: 'Vật lý',
    teacherId: 2,
    teacherName: 'Teacher One',
    createdAt: '2025-01-11T09:00:00Z',
  },
]

export const fetchAssignments = async (): Promise<SubjectAssignment[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return mockAssignments
}

export const createAssignment = async (
  payload: CreateAssignmentPayload,
): Promise<SubjectAssignment> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  // Mock: lấy tên từ các mock data khác
  const newAssignment: SubjectAssignment = {
    id: Date.now(),
    groupId: payload.groupId,
    groupName: `Group ${payload.groupId}`,
    subjectId: payload.subjectId,
    subjectName: `Subject ${payload.subjectId}`,
    teacherId: payload.teacherId,
    teacherName: `Teacher ${payload.teacherId}`,
    createdAt: new Date().toISOString(),
  }
  mockAssignments = [newAssignment, ...mockAssignments]
  return newAssignment
}

export const deleteAssignment = async (id: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200))
  mockAssignments = mockAssignments.filter((assignment) => assignment.id !== id)
}

