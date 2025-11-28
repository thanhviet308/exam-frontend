import { Card, Space, Typography } from 'antd'

const StudentProfilePage = () => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <Typography.Title level={3}>Hồ sơ</Typography.Title>
    <Card>
      <Typography.Paragraph>Thông tin cá nhân và cài đặt sẽ được hiển thị tại đây.</Typography.Paragraph>
    </Card>
  </Space>
)

export default StudentProfilePage

