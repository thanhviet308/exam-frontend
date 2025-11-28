import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { register } from '../../api/authApi'

type RegisterFormValues = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const RegisterPage = () => {
  const [error, setError] = useState<string | null>(null)

  const [form] = Form.useForm<RegisterFormValues>()

  const onFinish = async (values: RegisterFormValues) => {
    setError(null)
    try {
      const tokenResponse = await register({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      })
      
      // Auto login after registration using AuthContext
      const user = {
        id: tokenResponse.userId,
        fullName: tokenResponse.fullName,
        email: values.email,
        role: tokenResponse.role,
      }
      
      // Save tokens and user info
      localStorage.setItem('accessToken', tokenResponse.accessToken)
      localStorage.setItem('refreshToken', tokenResponse.refreshToken)
      localStorage.setItem('exam_center_auth', JSON.stringify({ token: tokenResponse.accessToken, user }))
      
      // Reload page to trigger AuthContext to read from localStorage
      window.location.href = '/student'
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      setError(errorMessage)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ecf2ff, #fdfbff)',
        padding: 24,
      }}
    >
      <Card style={{ width: 400 }} title={<Typography.Title level={4}>Đăng ký tài khoản</Typography.Title>}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
          Tạo tài khoản mới để tham gia các kỳ thi trắc nghiệm.
        </Typography.Paragraph>
        {error && (
          <Alert
            type="error"
            message="Đăng ký thất bại"
            description={error}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="email@example.com" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" size="large" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Đăng ký
          </Button>
        </Form>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Typography.Text type="secondary">
            Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
          </Typography.Text>
        </div>
      </Card>
    </div>
  )
}

export default RegisterPage

