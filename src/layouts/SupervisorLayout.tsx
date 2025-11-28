import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { DashboardOutlined, UnorderedListOutlined } from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'
import { useAuthContext } from '../context/AuthContext'

const { Sider, Header, Content } = Layout

const supervisorMenu = [
  { key: '/supervisor', label: <Link to="/supervisor">Tổng quan</Link>, icon: <DashboardOutlined /> },
  { key: '/supervisor/sessions', label: <Link to="/supervisor/sessions">Danh sách ca thi</Link>, icon: <UnorderedListOutlined /> },
]

const SupervisorLayout = () => {
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
          items={supervisorMenu}
          className="teacher-sider-menu"
        />
      </Sider>
      <Layout>
        <Header className="app-header teacher-header" style={{ paddingInline: 24, display: 'flex', alignItems: 'center' }}>
          <RoleHeader
            title="Trang giám thị"
            userName={user?.fullName ?? 'Giám thị'}
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

export default SupervisorLayout

