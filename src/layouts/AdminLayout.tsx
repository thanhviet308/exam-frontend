import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  DeploymentUnitOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'

const { Sider, Header, Content } = Layout

const adminMenu = [
  { key: '/admin', label: <Link to="/admin">Dashboard</Link>, icon: <DashboardOutlined /> },
  { key: '/admin/users', label: <Link to="/admin/users">Users</Link>, icon: <UserOutlined /> },
  { key: '/admin/groups', label: <Link to="/admin/groups">Student Groups</Link>, icon: <TeamOutlined /> },
  { key: '/admin/subjects', label: <Link to="/admin/subjects">Subjects</Link>, icon: <BookOutlined /> },
  { key: '/admin/assignments', label: <Link to="/admin/assignments">Assign Subject</Link>, icon: <DeploymentUnitOutlined /> },
  { key: '/admin/statistics', label: <Link to="/admin/statistics">System Statistics</Link>, icon: <BarChartOutlined /> },
]

const AdminLayout = () => {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="56">
        <div style={{ padding: 16, color: '#fff', fontWeight: 600 }}>Admin Center</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={adminMenu} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <RoleHeader title="Admin Portal" subtitle="System configuration & management" userName="System Admin" />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AdminLayout

