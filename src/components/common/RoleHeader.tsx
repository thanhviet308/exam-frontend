 import { Avatar, Button, Space, Typography } from 'antd'

interface RoleHeaderProps {
  title: string
  subtitle?: string
  userName?: string
  onLogout?: () => void
}

const RoleHeader = ({ title, subtitle, userName, onLogout }: RoleHeaderProps) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
      {subtitle && (
        <Typography.Text type="secondary" style={{ fontSize: 14, margin: 0 }}>
          {subtitle}
        </Typography.Text>
      )}
    </div>
    <Space size={12}>
      <Typography.Text strong>{userName ?? 'Người dùng'}</Typography.Text>
      <Avatar>{(userName ?? 'U').charAt(0).toUpperCase()}</Avatar>
      {onLogout && (
        <Button size="small" onClick={onLogout}>
          Đăng xuất
        </Button>
      )}
    </Space>
  </div>
)

export default RoleHeader

