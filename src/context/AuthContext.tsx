import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import type { AuthResponse, UserRole } from '../types'

interface AuthContextProps {
  userId?: number
  fullName?: string
  role?: UserRole
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextProps>({
  loading: false,
  login: async () => {},
  logout: () => {},
  isAuthenticated: false,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<Pick<AuthContextProps, 'userId' | 'fullName' | 'role'>>({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const storedAccess = localStorage.getItem('accessToken')
    const storedRefresh = localStorage.getItem('refreshToken')
    const storedRole = localStorage.getItem('role') as UserRole | undefined
    const storedUserId = localStorage.getItem('userId')
    const storedName = localStorage.getItem('fullName')

    if (storedAccess && storedRefresh && storedRole && storedUserId) {
      setAuthState({
        role: storedRole,
        userId: Number(storedUserId),
        fullName: storedName ?? undefined,
      })
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password })
    localStorage.setItem('accessToken', res.data.accessToken)
    localStorage.setItem('refreshToken', res.data.refreshToken)
    localStorage.setItem('role', res.data.role)
    localStorage.setItem('userId', res.data.userId.toString())
    localStorage.setItem('fullName', res.data.fullName)
    setAuthState({
      userId: res.data.userId,
      role: res.data.role,
      fullName: res.data.fullName,
    })
    navigate('/')
  }, [navigate])

  const logout = useCallback(() => {
    localStorage.clear()
    setAuthState({})
    navigate('/login')
  }, [navigate])

  const value = useMemo(
    () => ({
      ...authState,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(authState.userId),
    }),
    [authState, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)

