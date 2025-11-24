import { Layout, Menu } from 'antd'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  FileTextOutlined,
  FormOutlined,
  ClusterOutlined,
  CalendarOutlined,
  TableOutlined,
} from '@ant-design/icons'
import RoleHeader from '../components/common/RoleHeader'

const { Sider, Header, Content } = Layout

const teacherMenu = [
  { key: '/teacher', label: <Link to="/teacher">Dashboard</Link>, icon: <DashboardOutlined /> },
  { key: '/teacher/passages', label: <Link to="/teacher/passages">Passages</Link>, icon: <FileTextOutlined /> },
  { key: '/teacher/questions', label: <Link to="/teacher/questions">Question Bank</Link>, icon: <FormOutlined /> },
  { key: '/teacher/templates', label: <Link to="/teacher/templates">Exam Template</Link>, icon: <ClusterOutlined /> },
  { key: '/teacher/instances', label: <Link to="/teacher/instances">Exam Instance</Link>, icon: <CalendarOutlined /> },
  { key: '/teacher/results', label: <Link to="/teacher/results">Exam Results</Link>, icon: <TableOutlined /> },
]

const TeacherLayout = () => {
  const location = useLocation()

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="56" theme="light">
        <div style={{ padding: 16, fontWeight: 600 }}>Teacher Desk</div>
        <Menu mode="inline" selectedKeys={[location.pathname]} items={teacherMenu} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <RoleHeader title="Teacher Workspace" subtitle="Create questions, templates and exams" userName="Alice Teacher" />
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default TeacherLayout

