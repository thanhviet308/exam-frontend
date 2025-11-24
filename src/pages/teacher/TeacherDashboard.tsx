import { Card, Col, Row, Typography } from 'antd'

const TeacherDashboard = () => (
  <div>
    <Typography.Title level={3}>Teacher Dashboard</Typography.Title>
    <Typography.Paragraph type="secondary">
      Quick actions for question bank, templates and exams.
    </Typography.Paragraph>
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Card title="Recent Templates" bordered={false}>
          Coming soon
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="Upcoming Exams" bordered={false}>
          Coming soon
        </Card>
      </Col>
    </Row>
  </div>
)

export default TeacherDashboard

