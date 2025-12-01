import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as loginApi, refreshToken as refreshTokenApi } from '../api/authApi'
import apiClient from '../api/axiosClient'
import type { TokenResponse, UserRole, UserResponse } from '../types/models'

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
  updateUser: (userData: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  initialized: false,
  login: async () => Promise.reject(),
  logout: () => {},
  updateUser: () => {},
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

  // Fetch user info from server to get latest data
  const fetchUserInfo = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await apiClient.get<UserResponse>('/users/me')
      const userData: AuthUser = {
        id: response.data.id,
        fullName: response.data.fullName,
        email: response.data.email,
        role: response.data.role,
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      return userData
    } catch (error) {
      console.error('Failed to fetch user info:', error)
      return null
    }
  }, [])

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
              localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.accessToken)
              localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refreshToken)
              
              // Fetch latest user info from server (token is automatically added by interceptor)
              const userData = await fetchUserInfo()
              if (userData) {
                setUser(userData)
                setToken(tokenResponse.accessToken)
              } else {
                // Fallback to token response if fetch fails
                const newUser: AuthUser = {
                  id: tokenResponse.userId,
                  fullName: tokenResponse.fullName,
                  email: stored.user.email,
                  role: tokenResponse.role,
                }
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser))
                setUser(newUser)
                setToken(tokenResponse.accessToken)
              }
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
        // Token is still valid - fetch latest user info from server (token is automatically added by interceptor)
        const userData = await fetchUserInfo()
        if (userData) {
          setUser(userData)
          setToken(stored.token)
        } else {
          // Fallback to stored user if fetch fails
          setUser(stored.user)
          setToken(stored.token)
        }
      }
      setInitialized(true)
    }
    initAuth()
  }, [fetchUserInfo])

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
      localStorage.setItem(TOKEN_STORAGE_KEY, tokenResponse.accessToken)
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokenResponse.refreshToken)
      
      // Fetch latest user info from server to ensure we have the most up-to-date data (token is automatically added by interceptor)
      const userData = await fetchUserInfo()
      if (userData) {
        setUser(userData)
        setToken(tokenResponse.accessToken)
        return userData
      } else {
        // Fallback to token response if fetch fails
        const user: AuthUser = {
          id: tokenResponse.userId,
          fullName: tokenResponse.fullName,
          email: credentials.email,
          role: tokenResponse.role,
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
        setUser(user)
        setToken(tokenResponse.accessToken)
        return user
      }
    },
    [fetchUserInfo],
  )

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const updateUser = useCallback((userData: Partial<AuthUser>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser
      const updatedUser: AuthUser = {
        ...currentUser,
        ...userData,
      }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser))
      return updatedUser
    })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      initialized,
      login,
      logout,
      updateUser,
    }),
    [user, token, initialized, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)

