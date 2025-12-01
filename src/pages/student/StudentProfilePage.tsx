import { Card, Descriptions, Space, Typography, Avatar } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '../../context/AuthContext'
import apiClient from '../../api/axiosClient'
import type { UserResponse } from '../../types/models'
import { UserOutlined } from '@ant-design/icons'

const StudentProfilePage = () => {
  const { user } = useAuthContext()
  
  // Fetch full user info to get email using /me endpoint
  const userQuery = useQuery<UserResponse>({
    queryKey: ['user-profile-me'],
    queryFn: async () => {
      const response = await apiClient.get<UserResponse>('/users/me')
      return response.data
    },
    enabled: !!user?.id,
  })
  
  const displayUser = userQuery.data || user

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Hồ sơ</Typography.Title>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }}>
              {displayUser?.fullName?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {displayUser?.fullName || 'Sinh viên'}
              </Typography.Title>
              <Typography.Text type="secondary">{displayUser?.email || ''}</Typography.Text>
            </div>
          </div>

          <Descriptions title="Thông tin cá nhân" bordered column={1} loading={userQuery.isLoading}>
            <Descriptions.Item label="Họ và tên">
              {displayUser?.fullName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {displayUser?.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Vai trò">
              <Typography.Text>Sinh viên</Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
    </Space>
  )
}

export default StudentProfilePage

