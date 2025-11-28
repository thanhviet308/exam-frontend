import { Card, Space, Typography } from 'antd'

const StudentHistoryPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Lịch sử thi</Typography.Title>
    <Card>
      <Typography.Paragraph>Danh sách các kỳ thi đã hoàn thành và điểm số sẽ được hiển thị tại đây.</Typography.Paragraph>
    </Card>
  </Space>
)

export default StudentHistoryPage

