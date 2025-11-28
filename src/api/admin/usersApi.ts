import type { UserRole } from '../../types'

export interface AdminUser {
  id: number
  fullName: string
  email: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface UserFilter {
  role?: UserRole
  search?: string
}

export interface CreateUserPayload {
  fullName: string
  email: string
  role: UserRole
  password: string
  active: boolean
}

export interface UpdateUserPayload {
  fullName?: string
  email?: string
  role?: UserRole
  active?: boolean
}

let mockUsers: AdminUser[] = [
  {
    id: 1,
    fullName: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    active: true,
    createdAt: '2025-01-01T08:00:00Z',
  },
  {
    id: 2,
    fullName: 'Teacher One',
    email: 'teacher1@example.com',
    role: 'TEACHER',
    active: true,
    createdAt: '2025-01-02T09:00:00Z',
  },
  {
    id: 3,
    fullName: 'Student A',
    email: 'student1@example.com',
    role: 'STUDENT',
    active: true,
    createdAt: '2025-01-03T10:00:00Z',
  },
  {
    id: 4,
    fullName: 'Supervisor X',
    email: 'supervisor@example.com',
    role: 'SUPERVISOR',
    active: true,
    createdAt: '2025-01-04T11:00:00Z',
  },
]

export const fetchUsers = async (filter?: UserFilter): Promise<AdminUser[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  let result = [...mockUsers]
  if (filter?.role) {
    result = result.filter((user) => user.role === filter.role)
  }
  if (filter?.search) {
    const searchLower = filter.search.toLowerCase()
    result = result.filter(
      (user) =>
        user.fullName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower),
    )
  }
  return result
}

export const createUser = async (payload: CreateUserPayload): Promise<AdminUser> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  const newUser: AdminUser = {
    id: Date.now(),
    fullName: payload.fullName,
    email: payload.email,
    role: payload.role,
    active: payload.active,
    createdAt: new Date().toISOString(),
  }
  mockUsers = [newUser, ...mockUsers]
  return newUser
}

export const updateUser = async (id: number, payload: UpdateUserPayload): Promise<AdminUser> => {
  await new Promise((resolve) => setTimeout(resolve, 300))
  mockUsers = mockUsers.map((user) =>
    user.id === id ? { ...user, ...payload } : user,
  )
  return mockUsers.find((user) => user.id === id)!
}

export const toggleUserActive = async (id: number): Promise<AdminUser> => {
  await new Promise((resolve) => setTimeout(resolve, 200))
  mockUsers = mockUsers.map((user) =>
    user.id === id ? { ...user, active: !user.active } : user,
  )
  return mockUsers.find((user) => user.id === id)!
}

