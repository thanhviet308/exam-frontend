import { Card, Space, Typography } from 'antd'

const AdminUsersPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>User Management</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Placeholder for user table, filters and create/edit modal. This section will allow administrators to manage all
        accounts in the system.
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default AdminUsersPage

