import { Layout, Menu, Typography } from 'antd'
import {
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FormOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthContext } from '../../context/AuthContext'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: 'dashboard', label: <Link to="/">Tổng quan</Link>, icon: <DashboardOutlined /> },
  { key: 'users', label: <Link to="/users">Người dùng</Link>, icon: <UserOutlined /> },
  { key: 'subjects', label: <Link to="/subjects">Môn & chương</Link>, icon: <BookOutlined /> },
  { key: 'questions', label: <Link to="/questions">Ngân hàng câu hỏi</Link>, icon: <FormOutlined /> },
  { key: 'templates', label: <Link to="/templates">Khung đề</Link>, icon: <FileDoneOutlined /> },
  { key: 'instances', label: <Link to="/exam-instances">Kỳ thi</Link>, icon: <TeamOutlined /> },
  { key: 'statistics', label: <Link to="/statistics">Thống kê</Link>, icon: <BarChartOutlined /> },
]

const AppLayout = () => {
  const { user, logout } = useAuthContext()
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="60" theme="light">
        <div className="logo-area">Exam Center</div>
        <Menu
          mode="inline"
          selectedKeys={[menuItems.find((item) => location.pathname.startsWith(`/${item.key}`))?.key ?? 'dashboard']}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>
            <Typography.Text strong>{user?.fullName ?? 'User'}</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {user?.role ?? ''}
            </Typography.Text>
          </div>
          <Typography.Link onClick={logout}>
            <LogoutOutlined /> Đăng xuất
          </Typography.Link>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout

