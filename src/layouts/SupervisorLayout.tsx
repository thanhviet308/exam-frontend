import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { DashboardOutlined, FieldTimeOutlined } from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'

const { Sider, Header, Content } = Layout

const supervisorMenu = [
  { key: '/supervisor', label: <Link to="/supervisor">Exam Sessions</Link>, icon: <DashboardOutlined /> },
  { key: '/supervisor/monitoring', label: <Link to="/supervisor/monitoring">Monitoring</Link>, icon: <FieldTimeOutlined /> },
]

const SupervisorLayout = () => {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="56" theme="light">
        <div style={{ padding: 16, fontWeight: 600 }}>Supervisor</div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={supervisorMenu} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <RoleHeader title="Supervisor Console" subtitle="Manage assigned exam rooms" userName="Sara Supervisor" />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default SupervisorLayout

