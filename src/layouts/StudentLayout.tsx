import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'
import { useAuthContext } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const studentMenu = [
  { key: '/student', label: <Link to="/student">Tổng quan</Link>, icon: <DashboardOutlined /> },
  { key: '/student/exams', label: <Link to="/student/exams">Danh sách kỳ thi</Link>, icon: <ScheduleOutlined /> },
  { key: '/student/history', label: <Link to="/student/history">Lịch sử thi</Link>, icon: <HistoryOutlined /> },
  { key: '/student/profile', label: <Link to="/student/profile">Hồ sơ</Link>, icon: <IdcardOutlined /> },
]

const StudentLayout = () => {
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
        <div className="logo-area" style={{ padding: 16, fontWeight: 700, letterSpacing: 0.2 }}>
          Trung tâm khảo thí
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={studentMenu}
          className="teacher-sider-menu"
        />
      </Sider>
      <Layout>
        <Header className="app-header teacher-header" style={{ paddingInline: 24, display: 'flex', alignItems: 'center' }}>
          <RoleHeader
            title="Trang sinh viên"
            userName={user?.fullName ?? 'Sinh viên'}
            onLogout={handleLogout}
          />
        </Header>
        <Content className="teacher-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default StudentLayout

