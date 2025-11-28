import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as loginApi, refreshToken as refreshTokenApi } from '../api/authApi'
import type { TokenResponse, UserRole } from '../types/models'

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: UserRole
}

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  initialized: boolean
  login: (credentials: { email: string; password: string }) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  initialized: false,
  login: async () => Promise.reject(),
  logout: () => {},
})

const AUTH_STORAGE_KEY = 'exam_center_auth'
const TOKEN_STORAGE_KEY = 'accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken'

const getStoredAuth = (): { token: string; user: AuthUser } | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (!raw || !token) return null
  try {
    const user = JSON.parse(raw)
    return { token, user }
  } catch (error) {
    return null
  }
}

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const exp = payload.exp * 1000 // Convert to milliseconds
    const now = Date.now()
    // Refresh if token expires in less than 5 minutes
    return exp < now + 5 * 60 * 1000
  } catch (error) {
    return true
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
   const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const stored = getStoredAuth()
      if (stored) {
        // Check if token is expired and try to refresh
        const tokenExpired = isTokenExpired(stored.token)
        if (tokenExpired) {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
          if (refreshToken) {
            try {
              const tokenResponse = await refreshTokenApi({ refreshToken })
              // Persist auth directly in useEffect
              const newUser: AuthUser = {
                id: tokenResponse.userId,
                fullName: tokenResponse.fullName,
                email: stored.user.email, // Keep existing email
                role: tokenResponse.role,
              }
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser))
              localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.accessToken)
              localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refreshToken)
              setUser(newUser)
              setToken(tokenResponse.accessToken)
              setInitialized(true)
              return
            } catch (error) {
              // Refresh failed, clear auth
              localStorage.removeItem(AUTH_STORAGE_KEY)
              localStorage.removeItem(TOKEN_STORAGE_KEY)
              localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
              setUser(null)
              setToken(null)
              setInitialized(true)
              return
            }
          } else {
            // No refresh token, clear auth
            localStorage.removeItem(AUTH_STORAGE_KEY)
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
            setUser(null)
            setToken(null)
            setInitialized(true)
            return
          }
        }
        // Token is still valid
        setUser(stored.user)
        setToken(stored.token)
      }
      setInitialized(true)
    }
    initAuth()
  }, [])

  const persistAuth = useCallback((tokenResponse: TokenResponse) => {
    const user: AuthUser = {
      id: tokenResponse.userId,
      fullName: tokenResponse.fullName,
      email: '', // Email not in TokenResponse, will need to fetch or store separately
      role: tokenResponse.role,
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.accessToken)
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refreshToken)
    setUser(user)
    setToken(tokenResponse.accessToken)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    setUser(null)
    setToken(null)
  }, [])

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const tokenResponse = await loginApi(credentials)
      const user: AuthUser = {
        id: tokenResponse.userId,
        fullName: tokenResponse.fullName,
        email: credentials.email, // Store email from login
        role: tokenResponse.role,
      }
      persistAuth(tokenResponse)
      return user
    },
    [persistAuth],
  )

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      initialized,
      login,
      logout,
    }),
    [user, token, initialized, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)

