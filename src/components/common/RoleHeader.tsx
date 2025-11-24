import { Avatar, Breadcrumb, Space, Typography } from 'antd'

interface RoleHeaderProps {
  title: string
  subtitle?: string
  userName?: string
}

const RoleHeader = ({ title, subtitle, userName }: RoleHeaderProps) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
    <div>
      <Breadcrumb
        items={[
          { title: 'Home' },
          { title },
        ]}
      />
      <Typography.Title level={4} style={{ margin: '8px 0 0' }}>
        {title}
      </Typography.Title>
      {subtitle && (
        <Typography.Text type="secondary">
          {subtitle}
        </Typography.Text>
      )}
    </div>
    <Space size={12}>
      <Typography.Text strong>{userName ?? 'User'}</Typography.Text>
      <Avatar>{(userName ?? 'U').charAt(0).toUpperCase()}</Avatar>
    </Space>
  </div>
)

export default RoleHeader

