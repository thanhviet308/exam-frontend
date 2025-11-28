import { useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser } from '../../api/adminApi'
import type { UserResponse, CreateUserRequest, UpdateUserRequest, UserRole } from '../../types/models'

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Quản trị viên',
  TEACHER: 'Giáo viên',
  STUDENT: 'Sinh viên',
  SUPERVISOR: 'Giám thị',
}

type UserFilter = {
  role?: UserRole
  search?: string
}

const AdminUsersPage = () => {
  const [filters, setFilters] = useState<UserFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserResponse | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const usersQuery = useQuery<UserResponse[]>({
    queryKey: ['admin-users'],
    queryFn: () => getUsers(),
  })

  // Filter users on client side
  const filteredUsers = usersQuery.data?.filter((user) => {
    if (filters.role && user.role !== filters.role) return false
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (
        !user.fullName.toLowerCase().includes(searchLower) &&
        !user.email.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }
    return true
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    onSuccess: () => {
      message.success('Đã tạo người dùng mới')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      form.resetFields()
      setModalOpen(false)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Tạo người dùng thất bại')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserRequest }) =>
      updateUser(id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật người dùng')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      form.resetFields()
      setEditing(null)
      setModalOpen(false)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Cập nhật người dùng thất bại')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      message.success('Đã xóa người dùng')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Xóa người dùng thất bại')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      updateUser(id, { active }),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Cập nhật trạng thái thất bại')
    },
  })

  const columns: ColumnsType<UserResponse> = [
    { title: 'Họ tên', dataIndex: 'fullName', width: 180 },
    { title: 'Email', dataIndex: 'email', width: 200 },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      width: 120,
      render: (role: UserRole) => {
        const colorMap: Record<UserRole, string> = {
          ADMIN: 'red',
          TEACHER: 'blue',
          STUDENT: 'green',
          SUPERVISOR: 'orange',
        }
        return <Tag color={colorMap[role]}>{ROLE_LABELS[role]}</Tag>
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      width: 100,
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          loading={toggleMutation.isPending}
          onChange={(checked) => toggleMutation.mutate({ id: record.id, active: checked })}
        />
      ),
    },
    {
      title: 'Thao tác',
      width: 180,
      render: (_: unknown, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa người dùng này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="link" danger loading={deleteMutation.isPending}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (user: UserResponse) => {
    setEditing(user)
    setModalOpen(true)
    form.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      active: user.active,
    })
  }

  const handleAdd = () => {
    setEditing(null)
    setModalOpen(true)
    form.resetFields()
    form.setFieldsValue({ active: true, role: 'STUDENT' })
  }

  const handleSubmit = (values: any) => {
    if (editing) {
      const payload: UpdateUserRequest = {
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        active: values.active,
        newPassword: values.newPassword || undefined,
      }
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      const payload: CreateUserRequest = {
        fullName: values.fullName,
        email: values.email,
        role: values.role,
        password: values.password,
        active: values.active ?? true,
      }
      createMutation.mutate(payload)
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Quản lý người dùng</Typography.Title>

      <Card className="card">
        <Form layout="inline" onValuesChange={(_, allValues) => setFilters(allValues as UserFilter)}>
          <Form.Item name="role" label="Vai trò">
            <Select placeholder="Chọn vai trò" allowClear style={{ width: 200 }}>
              <Select.Option value="ADMIN">{ROLE_LABELS.ADMIN}</Select.Option>
              <Select.Option value="TEACHER">{ROLE_LABELS.TEACHER}</Select.Option>
              <Select.Option value="STUDENT">{ROLE_LABELS.STUDENT}</Select.Option>
              <Select.Option value="SUPERVISOR">{ROLE_LABELS.SUPERVISOR}</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="search" label="Tìm kiếm">
            <Input.Search placeholder="Tìm theo tên hoặc email" style={{ width: 300 }} allowClear />
          </Form.Item>
          <Form.Item style={{ marginLeft: 'auto' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm người dùng
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card className="card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredUsers}
          loading={usersQuery.isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input placeholder="Nhập họ tên" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select placeholder="Chọn vai trò">
              <Select.Option value="ADMIN">{ROLE_LABELS.ADMIN}</Select.Option>
              <Select.Option value="TEACHER">{ROLE_LABELS.TEACHER}</Select.Option>
              <Select.Option value="STUDENT">{ROLE_LABELS.STUDENT}</Select.Option>
              <Select.Option value="SUPERVISOR">{ROLE_LABELS.SUPERVISOR}</Select.Option>
            </Select>
          </Form.Item>
          {!editing ? (
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Nhập mật khẩu' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}
            >
              <Input.Password placeholder="••••••" />
            </Form.Item>
          ) : (
            <Form.Item
              name="newPassword"
              label="Mật khẩu mới (để trống nếu không đổi)"
              rules={[{ min: 6, message: 'Tối thiểu 6 ký tự' }]}
            >
              <Input.Password placeholder="••••••" />
            </Form.Item>
          )}
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default AdminUsersPage
