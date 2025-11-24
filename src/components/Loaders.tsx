import { Spin, Result, Button } from 'antd'

export const PageSpinner = () => (
  <div className="centered">
    <Spin size="large" />
  </div>
)

export const ErrorState = ({ message, onRetry }: { message?: string; onRetry?: () => void }) => (
  <Result
    status="error"
    title="Có lỗi xảy ra"
    subTitle={message ?? 'Vui lòng thử lại sau.'}
    extra={
      onRetry ? (
        <Button type="primary" onClick={onRetry}>
          Thử lại
        </Button>
      ) : null
    }
  />
)

