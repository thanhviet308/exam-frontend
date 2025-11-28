export interface StudentGroup {
  id: number
  name: string
  createdAt: string
  numberOfStudents: number
}

export interface CreateGroupPayload {
  name: string
}

let mockGroups: StudentGroup[] = [
  {
    id: 1,
    name: '10A1',
    createdAt: '2025-01-01T08:00:00Z',
    numberOfStudents: 30,
  },
  {
    id: 2,
    name: '10A2',
    createdAt: '2025-01-02T09:00:00Z',
    numberOfStudents: 28,
  },
  {
    id: 3,
    name: '11B1',
    createdAt: '2025-01-03T10:00:00Z',
    numberOfStudents: 32,
  },
]

export const fetchGroups = async (): Promise<StudentGroup[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return mockGroups
}

export const createGroup = async (payload: CreateGroupPayload): Promise<StudentGroup> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const newGroup: StudentGroup = {
    id: Date.now(),
    name: payload.name,
    createdAt: new Date().toISOString(),
    numberOfStudents: 0,
  }
  mockGroups = [newGroup, ...mockGroups]
  return newGroup
}

export const updateGroup = async (id: number, payload: CreateGroupPayload): Promise<StudentGroup> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  mockGroups = mockGroups.map((group) =>
    group.id === id ? { ...group, name: payload.name } : group,
  )
  return mockGroups.find((group) => group.id === id)!
}

export const deleteGroup = async (id: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200))
  mockGroups = mockGroups.filter((group) => group.id !== id)
}

export interface StudentForGroup {
  id: number
  fullName: string
  email: string
  groupId?: number
}

export const fetchStudentsForGroup = async (): Promise<StudentForGroup[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250))
  return [
    { id: 101, fullName: 'Nguyễn Văn A', email: 'student1@example.com', groupId: 1 },
    { id: 102, fullName: 'Trần Thị B', email: 'student2@example.com', groupId: 1 },
    { id: 103, fullName: 'Lê Văn C', email: 'student3@example.com', groupId: 2 },
    { id: 104, fullName: 'Phạm Thị D', email: 'student4@example.com' },
    { id: 105, fullName: 'Hoàng Văn E', email: 'student5@example.com' },
  ]
}

export const assignStudentsToGroup = async (
  groupId: number,
  studentIds: number[],
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  const group = mockGroups.find((g) => g.id === groupId)
  if (group) {
    group.numberOfStudents = studentIds.length
  }
}

