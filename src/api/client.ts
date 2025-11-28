import axios, { AxiosHeaders } from 'axios'

const AUTH_STORAGE_KEY = 'exam_center_auth'

const getStoredToken = (): string | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed.token ?? null
  } catch {
    return null
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient

