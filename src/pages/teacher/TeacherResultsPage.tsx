import { Card, Space, Typography } from 'antd'

const TeacherResultsPage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Exam Results</Typography.Title>
    <Card>
      <Typography.Paragraph>
        Placeholder for selecting exam instance and reviewing student scores/status.
      </Typography.Paragraph>
    </Card>
  </Space>
)

export default TeacherResultsPage

