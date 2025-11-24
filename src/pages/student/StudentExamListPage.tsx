import { Card, Space, Typography } from 'antd'

const StudentExamListPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Exam List</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Placeholder for exam cards with schedule, status and start buttons.
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default StudentExamListPage

