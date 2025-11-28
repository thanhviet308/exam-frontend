import { Layout, Menu, Typography } from 'antd'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  FileTextOutlined,
  FormOutlined,
  ClusterOutlined,
  CalendarOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { useAuthContext } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const teacherMenu = [
  { key: '/teacher', label: <Link to="/teacher">Tổng quan</Link>, icon: <DashboardOutlined /> },
  { key: '/teacher/passages', label: <Link to="/teacher/passages">Đoạn văn</Link>, icon: <FileTextOutlined /> },
  { key: '/teacher/questions', label: <Link to="/teacher/questions">Ngân hàng câu hỏi</Link>, icon: <FormOutlined /> },
  { key: '/teacher/templates', label: <Link to="/teacher/templates">Khung đề</Link>, icon: <ClusterOutlined /> },
  { key: '/teacher/exams', label: <Link to="/teacher/exams">Kỳ thi</Link>, icon: <CalendarOutlined /> },
  { key: '/teacher/results', label: <Link to="/teacher/results">Kết quả</Link>, icon: <TableOutlined /> },
]

const TeacherLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthContext()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Layout className="teacher-layout">
      <Sider
        breakpoint="lg"
        collapsedWidth="56"
        theme="dark"
        className="teacher-sider"
      >
        <div className="logo-area" style={{ padding: 16, fontWeight: 700, letterSpacing: 0.2 }}>Trung tâm khảo thí</div>
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={teacherMenu}
          className="teacher-sider-menu"
        />
      </Sider>
      <Layout>
        <Header className="app-header teacher-header" style={{ paddingInline: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Text strong>{user?.fullName ?? 'User'}</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>{user?.role ?? ''}</Typography.Text>
          </div>
          <Typography.Link onClick={handleLogout}>Đăng xuất</Typography.Link>
        </Header>
        <Content className="teacher-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default TeacherLayout

