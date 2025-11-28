import { useState } from 'react'
import { Button, Drawer, Form, Input, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { User, UserRole } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const roleOptions: UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT', 'SUPERVISOR']

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giáo viên',
  STUDENT: 'Sinh viên',
  SUPERVISOR: 'Giám thị',
}

type UserPayload = Partial<User> & { password?: string }

const UsersPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<User[]>('/users')
      return res.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (values: UserPayload) => {
      if (editingUser) {
        return apiClient.put<User>(`/users/${editingUser.id}`, values)
      }
      return apiClient.post<User>('/users', values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setDrawerOpen(false)
      setEditingUser(null)
    },
  })

  const columns = [
    { title: 'Họ tên', dataIndex: 'fullName' },
    { title: 'Email', dataIndex: 'email' },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      render: (role: UserRole) => <Tag color="blue">{ROLE_LABELS[role]}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      render: (active: boolean) => (active ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>),
    },
    {
      title: 'Thao tác',
      render: (_: unknown, record: User) => (
        <Button
          size="small"
          onClick={() => {
            setEditingUser(record)
            form.setFieldsValue(record)
            setDrawerOpen(true)
          }}
        >
          Sửa
        </Button>
      ),
    },
  ]

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Quản lý người dùng
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setEditingUser(null)
            form.resetFields()
            form.setFieldValue('active', true)
            setDrawerOpen(true)
          }}
        >
          Thêm người dùng
        </Button>
      </Space>
      <Table rowKey="id" dataSource={data} columns={columns} pagination={{ pageSize: 10 }} />

      <Drawer
        title={editingUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
      >
        <Form layout="vertical" form={form} onFinish={(values: UserPayload) => saveMutation.mutate(values)}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select
              options={roleOptions.map((role) => ({
                label: ROLE_LABELS[role],
                value: role,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="active"
            label="Kích hoạt"
            valuePropName="checked"
            initialValue
          >
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saveMutation.isPending}>
            Lưu
          </Button>
        </Form>
      </Drawer>
    </>
  )
}

export default UsersPage

