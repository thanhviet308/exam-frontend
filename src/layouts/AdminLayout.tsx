import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'
import { useAuthContext } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const adminMenu = [
  { key: '/admin', label: <Link to="/admin">Tổng quan</Link>, icon: <DashboardOutlined /> },
  { key: '/admin/users', label: <Link to="/admin/users">Người dùng</Link>, icon: <UserOutlined /> },
  { key: '/admin/groups', label: <Link to="/admin/groups">Nhóm sinh viên</Link>, icon: <TeamOutlined /> },
  { key: '/admin/subjects', label: <Link to="/admin/subjects">Môn học</Link>, icon: <BookOutlined /> },
  { key: '/admin/assign', label: <Link to="/admin/assign">Gán môn học</Link>, icon: <DeploymentUnitOutlined /> },
  { key: '/admin/statistics', label: <Link to="/admin/statistics">Thống kê hệ thống</Link>, icon: <BarChartOutlined /> },
]

const AdminLayout = () => {
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
          Trung tâm quản trị
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={adminMenu}
          className="teacher-sider-menu"
        />
      </Sider>
      <Layout>
        <Header className="app-header teacher-header" style={{ paddingInline: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <RoleHeader title="Trang quản trị" userName={user?.fullName ?? 'Quản trị viên hệ thống'} onLogout={handleLogout} />
        </Header>
        <Content className="teacher-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout

