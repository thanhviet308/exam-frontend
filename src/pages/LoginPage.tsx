import { Card, Form, Input, Button, Typography } from 'antd'
import { useAuthContext } from '../context/AuthContext'

const LoginPage = () => {
    const { login, loading } = useAuthContext()

    const onFinish = async (values: { email: string; password: string }) => {
        await login(values.email, values.password)
    }

    return (
        <div className="login-wrapper">
            <Card title="Đăng nhập hệ thống thi" style={{ width: 360 }}>
                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }]}>
                        <Input placeholder="admin@example.com" />
                    </Form.Item>
                    <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                        <Input.Password placeholder="••••••" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Đăng nhập
                    </Button>
                    <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
                        Demo: admin@example.com / Admin123! (xem DataSeeder)
                    </Typography.Paragraph>
                </Form>
            </Card>
        </div>
    )
}

export default LoginPage

