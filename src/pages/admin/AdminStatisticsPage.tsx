import { Card, Space, Typography } from 'antd'

const AdminStatisticsPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>System Statistics</Typography.Title>
    <Card>
      <Typography.Paragraph>Placeholder for system wide charts and KPIs.</Typography.Paragraph>
    </Card>
  </Space>
)

export default AdminStatisticsPage

