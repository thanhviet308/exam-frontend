import { Card, Space, Typography } from 'antd'

const AdminSubjectsPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Subject Management</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Placeholder for subject list, create/edit modal and description/status controls.
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default AdminSubjectsPage

