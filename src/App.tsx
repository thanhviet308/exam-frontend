import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import AppRouter from './router/AppRouter'
import { AuthProvider } from './context/AuthContext'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 8,
          colorBgLayout: '#f5f6fb',
        },
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConfigProvider>
  </QueryClientProvider>
)

export default App
