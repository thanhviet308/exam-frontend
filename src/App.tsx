import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppRouter from './router/AppRouter'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppRouter />
  </QueryClientProvider>
)

export default App
