import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'
import { Mail, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react'

type LoginFormValues = {
  email: string
  password: string
}

const roleRedirectMap = {
  ADMIN: '/admin',
  TEACHER: '/teacher',
  STUDENT: '/student',
  SUPERVISOR: '/supervisor',
} as const

const LoginPage = () => {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthContext()
  const navigate = useNavigate()

  const onFinish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const values: LoginFormValues = {
      email: (formData.get('email') as string) ?? '',
      password: (formData.get('password') as string) ?? '',
    }

    try {
      const normalizedValues = {
        email: values.email.toLowerCase().trim(),
        password: values.password.trim(),
      }
      const user = await login(normalizedValues)
      navigate(roleRedirectMap[user.role])
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ?? err?.message ?? 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl mb-6 shadow-2xl shadow-primary-500/25">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-secondary-900 mb-3 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            Hệ thống thi trắc nghiệm
          </h1>
          <p className="text-secondary-600 text-lg">Đăng nhập để tiếp tục làm việc</p>
        </div>

        {/* Login Card */}
        <div
          className="card animate-slide-up backdrop-blur-sm bg-white/95 shadow-2xl shadow-primary-500/10 border-primary-100"
          style={{ animationDelay: '0.1s' }}
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <p className="text-red-800 font-semibold text-sm">Đăng nhập thất bại</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={onFinish} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-secondary-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-field pl-10"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-semibold text-secondary-700">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-secondary-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-secondary-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary-600">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

