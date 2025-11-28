import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

const UnauthorizedPage = () => {
  const navigate = useNavigate()
  return (
    <Result
      status="403"
      title="Không có quyền truy cập"
      subTitle="Bạn không có quyền truy cập trang này. Vui lòng đăng nhập với tài khoản phù hợp."
      extra={
        <Button type="primary" onClick={() => navigate('/login')}>
          Quay lại trang đăng nhập
        </Button>
      }
    />
  )
}

export default UnauthorizedPage

