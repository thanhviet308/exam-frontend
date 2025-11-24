import axios, { AxiosHeaders } from 'axios'

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
    withCredentials: false,
})

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        const headers = config.headers instanceof AxiosHeaders ? config.headers : new AxiosHeaders(config.headers)
        headers.set('Authorization', `Bearer ${token}`)
        config.headers = headers
    }
    return config
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken')
            if (!refreshToken) {
                localStorage.removeItem('accessToken')
                window.location.href = '/login'
                return Promise.reject(error)
            }
            try {
                const res = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'}/auth/refresh`,
                    { refreshToken },
                )
                localStorage.setItem('accessToken', res.data.accessToken)
                localStorage.setItem('refreshToken', res.data.refreshToken)
                error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
                return apiClient(error.config)
            } catch (refreshError) {
                localStorage.removeItem('accessToken')
                localStorage.removeItem('refreshToken')
                window.location.href = '/login'
                return Promise.reject(refreshError)
            }
        }
        return Promise.reject(error)
    },
)

export default apiClient

