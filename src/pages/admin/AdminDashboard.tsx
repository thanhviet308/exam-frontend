import { Card, Col, Row, Typography } from 'antd'

const AdminDashboard = () => (
  <div>
    <Typography.Title level={3}>Admin Dashboard</Typography.Title>
    <Typography.Paragraph type="secondary">
      Overview widgets will be displayed here.
    </Typography.Paragraph>
    <Row gutter={16}>
      <Col xs={24} md={8}>
        <Card title="Users">--</Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Subjects">--</Card>
      </Col>
      <Col xs={24} md={8}>
        <Card title="Upcoming Exams">--</Card>
      </Col>
    </Row>
  </div>
)

export default AdminDashboard

