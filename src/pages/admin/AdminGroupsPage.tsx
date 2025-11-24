import { Card, Space, Typography } from 'antd'

const AdminGroupsPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Student Groups</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Placeholder for student group table, CRUD actions and assign student workflow.
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default AdminGroupsPage

