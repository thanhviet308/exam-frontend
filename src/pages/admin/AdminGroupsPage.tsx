import { useState } from 'react'
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getStudentGroups, createStudentGroup, updateStudentGroup, deleteStudentGroup, getUsersByRole } from '../../api/adminApi'
import type { StudentGroupResponse, CreateStudentGroupRequest, UserResponse } from '../../types/models'
import { ErrorState, PageSpinner } from '../../components/Loaders'

const AdminGroupsPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [editing, setEditing] = useState<StudentGroupResponse | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [form] = Form.useForm()
  const [assignForm] = Form.useForm()
  const queryClient = useQueryClient()

  const groupsQuery = useQuery<StudentGroupResponse[]>({
    queryKey: ['admin-groups'],
    queryFn: getStudentGroups,
  })

  // Lazy load students only when modal is open
  const studentsQuery = useQuery<UserResponse[]>({
    queryKey: ['admin-students'],
    queryFn: () => getUsersByRole('STUDENT'),
    enabled: assignModalOpen, // Only fetch when modal is open
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateStudentGroupRequest) => createStudentGroup(payload),
    onSuccess: () => {
      message.success('Đã tạo nhóm mới')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      form.resetFields()
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CreateStudentGroupRequest }) =>
      updateStudentGroup(id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật nhóm')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      form.resetFields()
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStudentGroup(id),
    onSuccess: () => {
      message.success('Đã xóa nhóm')
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
    },
  })

  const assignMutation = useMutation({
    // TODO: hiện chưa có API backend cho gán sinh viên vào nhóm, tạm thời mock để UI hoạt động
    mutationFn: async (_: { groupId: number; studentIds: number[] }) => {},
  })

  const columns: ColumnsType<StudentGroupResponse> = [
    { title: 'Tên nhóm', dataIndex: 'name', width: 150 },
    {
      title: 'Số sinh viên',
      dataIndex: 'numberOfStudents',
      width: 120,
      render: (value: number) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Thao tác',
      width: 200,
      render: (_: unknown, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Button type="link" onClick={() => handleAssign(record.id)}>
            Gán sinh viên
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const studentColumns: ColumnsType<UserResponse> = [
    {
      title: 'Chọn',
      width: 80,
      render: (_: unknown, record) => (
        <Checkbox
          checked={selectedStudents.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedStudents([...selectedStudents, record.id])
            } else {
              setSelectedStudents(selectedStudents.filter((id) => id !== record.id))
            }
          }}
        />
      ),
    },
    { title: 'Họ tên', dataIndex: 'fullName' },
    { title: 'Email', dataIndex: 'email' },
  ]

  const handleEdit = (group: StudentGroupResponse) => {
    setEditing(group)
    form.setFieldsValue({ name: group.name })
    setModalOpen(true)
  }

  const handleAdd = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: 'Bạn có chắc muốn xóa nhóm này?',
      onOk: () => deleteMutation.mutate(id),
    })
  }

  const handleAssign = (groupId: number) => {
    setSelectedGroup(groupId)
    assignForm.setFieldsValue({ groupId })
    setSelectedStudents([])
    setAssignModalOpen(true)
  }

  const handleAssignSubmit = () => {
    if (!selectedGroup) return
    if (selectedStudents.length === 0) {
      message.warning('Chọn ít nhất một sinh viên')
      return
    }
    assignMutation.mutate({ groupId: selectedGroup, studentIds: selectedStudents })
  }

  const handleSubmit = (values: { name: string }) => {
    const payload: CreateStudentGroupRequest = { name: values.name }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  if (groupsQuery.isLoading) {
    return <PageSpinner />
  }

  if (groupsQuery.error) {
    return (
      <ErrorState
        message={(groupsQuery.error as Error).message || 'Không thể tải danh sách nhóm sinh viên'}
        onRetry={() => groupsQuery.refetch()}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Quản lý nhóm sinh viên</Typography.Title>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm nhóm mới
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={groupsQuery.data || []}
          loading={groupsQuery.isFetching}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title="Thêm/Sửa nhóm"
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
            <Input placeholder="Ví dụ: 10A1" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={assignModalOpen}
        title="Gán sinh viên vào nhóm"
        width={800}
        onCancel={() => {
          setAssignModalOpen(false)
          setSelectedGroup(null)
          setSelectedStudents([])
        }}
        onOk={handleAssignSubmit}
        confirmLoading={assignMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={assignForm}>
          <Form.Item name="groupId" label="Chọn nhóm">
            <Select disabled placeholder="Chọn nhóm">
              {groupsQuery.data?.map((group) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
        <Typography.Paragraph style={{ marginTop: 16 }}>
          Chọn sinh viên để gán vào nhóm (đã chọn: {selectedStudents.length})
        </Typography.Paragraph>
        <Table
          rowKey="id"
          columns={studentColumns}
          dataSource={studentsQuery.data}
          loading={studentsQuery.isLoading}
          pagination={{ pageSize: 8 }}
        />
      </Modal>
    </Space>
  )
}

export default AdminGroupsPage
