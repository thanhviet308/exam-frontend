import { Card, Space, Typography } from 'antd'

const StudentHistoryPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Exam History</Typography.Title>
    <Card>
      <Typography.Paragraph>Placeholder for completed exams and scores.</Typography.Paragraph>
    </Card>
  </Space>
)

export default StudentHistoryPage

