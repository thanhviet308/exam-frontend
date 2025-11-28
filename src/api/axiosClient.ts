
import axios from 'axios'

// Tạm thời hard-code baseURL giống hệt Postman để tránh sai cấu hình env
const API_BASE_URL = 'http://localhost:8081/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    // Log nhẹ để debug xem frontend gọi đúng URL chưa
    // (chỉ hiện trên devtools console, không ảnh hưởng chức năng)
    // eslint-disable-next-line no-console
    console.log('[API REQUEST]', config.method?.toUpperCase(), API_BASE_URL + (config.url || ''))

    // Không gắn token cho các endpoint public
    const isPublicAuthEndpoint = config.url?.startsWith('/auth/register') || config.url?.startsWith('/auth/login')
    if (!isPublicAuthEndpoint) {
      const token = localStorage.getItem('accessToken')
      if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // eslint-disable-next-line no-console
    console.error('[API ERROR]', error?.response?.status, error?.response?.data || error.message)

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', res.data.accessToken)
        localStorage.setItem('refreshToken', res.data.refreshToken)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  },
)

export default apiClient
