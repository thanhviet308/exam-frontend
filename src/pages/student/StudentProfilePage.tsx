import { Card, Space, Typography } from 'antd'

const StudentProfilePage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Profile</Typography.Title>
    <Card>
      <Typography.Paragraph>Placeholder for personal information and settings.</Typography.Paragraph>
    </Card>
  </Space>
)

export default StudentProfilePage

