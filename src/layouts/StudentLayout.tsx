import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  ScheduleOutlined,
  HistoryOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'

const { Sider, Header, Content } = Layout

const studentMenu = [
  { key: '/student', label: <Link to="/student">Dashboard</Link>, icon: <DashboardOutlined /> },
  { key: '/student/exams', label: <Link to="/student/exams">Exam List</Link>, icon: <ScheduleOutlined /> },
  { key: '/student/history', label: <Link to="/student/history">History</Link>, icon: <HistoryOutlined /> },
  { key: '/student/profile', label: <Link to="/student/profile">Profile</Link>, icon: <IdcardOutlined /> },
]

const StudentLayout = () => {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="56">
        <div style={{ padding: 16, color: '#fff', fontWeight: 600 }}>Student Portal</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={studentMenu} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <RoleHeader title="Student Dashboard" subtitle="Manage your exams and results" userName="Bob Student" />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default StudentLayout

