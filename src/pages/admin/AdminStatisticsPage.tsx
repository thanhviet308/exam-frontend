import { Card, Space, Typography } from 'antd'

const AdminStatisticsPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Thống kê hệ thống</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Khu vực thống kê biểu đồ và chỉ số quan trọng của toàn hệ thống (đang cập nhật).
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default AdminStatisticsPage

