import { useState } from 'react'
import { Button, Card, Form, Modal, Popconfirm, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStudentGroups,
  getSubjects,
  getUsersByRole,
  getSubjectAssignments,
  createSubjectAssignment,
  updateSubjectAssignment,
  deleteSubjectAssignment,
} from '../../api/adminApi'
import type {
  StudentGroupResponse,
  SubjectResponse,
  UserResponse,
  SubjectAssignment,
  CreateSubjectAssignmentRequest,
} from '../../types/models'
import { ErrorState, PageSpinner } from '../../components/Loaders'

const AdminAssignPage = () => {
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<SubjectAssignment | null>(null)
  const queryClient = useQueryClient()

  const assignmentsQuery = useQuery<SubjectAssignment[]>({
    queryKey: ['admin-assignments'],
    queryFn: getSubjectAssignments,
  })

  const groupsQuery = useQuery<StudentGroupResponse[]>({
    queryKey: ['admin-groups'],
    queryFn: getStudentGroups,
  })

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['admin-subjects'],
    queryFn: getSubjects,
  })

  // Only fetch teachers, more efficient than fetching all users
  const teachersQuery = useQuery<UserResponse[]>({
    queryKey: ['admin-teachers'],
    queryFn: () => getUsersByRole('TEACHER'),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSubjectAssignmentRequest) => createSubjectAssignment(payload),
    onSuccess: () => {
      message.success('Đã gán môn học cho nhóm')
      // Invalidate both admin and teacher assignment queries
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['subject-assignments'] }) // This will invalidate all teacher queries
      form.resetFields()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể gán môn học. Vui lòng thử lại.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ record, payload }: { record: SubjectAssignment; payload: CreateSubjectAssignmentRequest }) =>
      updateSubjectAssignment(record.groupId, record.subjectId, payload),
    onSuccess: () => {
      message.success('Đã cập nhật gán môn học')
      // Invalidate both admin and teacher assignment queries
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['subject-assignments'] })
      setEditModalOpen(false)
      setEditingAssignment(null)
      editForm.resetFields()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể cập nhật gán môn học. Vui lòng thử lại.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (record: SubjectAssignment) =>
      deleteSubjectAssignment(record.groupId, record.subjectId),
    onSuccess: () => {
      message.success('Đã xóa gán môn học')
      // Invalidate both admin and teacher assignment queries
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['subject-assignments'] })
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể xóa gán môn học. Vui lòng thử lại.')
    },
  })

  const columns: ColumnsType<SubjectAssignment> = [
    { title: 'Nhóm sinh viên', dataIndex: 'groupName', width: 150 },
    { title: 'Môn học', dataIndex: 'subjectName', width: 150 },
    { title: 'Giáo viên', dataIndex: 'teacherName', width: 180 },
    {
      title: 'Ngày gán',
      dataIndex: 'assignedAt',
      width: 180,
      render: (value: string) => {
        if (!value) return '-'
        try {
          return new Date(value).toLocaleString('vi-VN')
        } catch (error) {
          return value
        }
      },
    },
    {
      title: 'Thao tác',
      width: 150,
      render: (_: unknown, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => {
              setEditingAssignment(record)
              editForm.setFieldsValue({
                groupId: record.groupId,
                subjectId: record.subjectId,
                teacherId: record.teacherId,
              })
              setEditModalOpen(true)
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa gán môn học này?"
            onConfirm={() => deleteMutation.mutate(record)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="link" danger loading={deleteMutation.isPending}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleSubmit = (values: { groupId: number; subjectId: number; teacherId: number }) => {
    const payload: CreateSubjectAssignmentRequest = {
      groupId: values.groupId,
      subjectId: values.subjectId,
      teacherId: values.teacherId,
    }
    createMutation.mutate(payload)
  }

  // Show error immediately if any query has error
  const error = assignmentsQuery.error || groupsQuery.error || subjectsQuery.error || teachersQuery.error
  if (error && !assignmentsQuery.isLoading && !groupsQuery.isLoading && !subjectsQuery.isLoading && !teachersQuery.isLoading) {
    return (
      <ErrorState
        message={(error as Error).message || 'Không thể tải dữ liệu'}
        onRetry={() => {
          assignmentsQuery.refetch()
          groupsQuery.refetch()
          subjectsQuery.refetch()
          teachersQuery.refetch()
        }}
      />
    )
  }

  // Show loading only if all queries are still loading on initial load
  if (
    (assignmentsQuery.isLoading || assignmentsQuery.isFetching) &&
    (groupsQuery.isLoading || groupsQuery.isFetching) &&
    (subjectsQuery.isLoading || subjectsQuery.isFetching) &&
    (teachersQuery.isLoading || teachersQuery.isFetching) &&
    !assignmentsQuery.data &&
    !groupsQuery.data &&
    !subjectsQuery.data &&
    !teachersQuery.data
  ) {
    return <PageSpinner />
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Gán môn học cho nhóm</Typography.Title>

      <Card title="Gán môn học mới">
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item
            name="groupId"
            label="Chọn nhóm sinh viên"
            rules={[{ required: true, message: 'Chọn nhóm sinh viên' }]}
          >
            <Select placeholder="Chọn nhóm" loading={groupsQuery.isLoading}>
              {groupsQuery.data?.map((group) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="subjectId"
            label="Chọn môn học"
            rules={[{ required: true, message: 'Chọn môn học' }]}
          >
            <Select placeholder="Chọn môn học" loading={subjectsQuery.isLoading}>
              {subjectsQuery.data?.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="teacherId"
            label="Chọn giáo viên"
            rules={[{ required: true, message: 'Chọn giáo viên' }]}
          >
            <Select placeholder="Chọn giáo viên" loading={teachersQuery.isLoading}>
              {teachersQuery.data?.map((teacher) => (
                <Select.Option key={teacher.id} value={teacher.id}>
                  {teacher.fullName} ({teacher.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending}>
              Gán môn học
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Danh sách gán môn học">
        <Table
          rowKey={(record) => `${record.groupId}-${record.subjectId}-${record.teacherId}`}
          columns={columns}
          dataSource={assignmentsQuery.data || []}
          loading={assignmentsQuery.isFetching}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={editModalOpen}
        title="Sửa gán môn học"
        onCancel={() => {
          setEditModalOpen(false)
          setEditingAssignment(null)
          editForm.resetFields()
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={editForm} onFinish={(values) => {
          if (!editingAssignment) return
          const payload: CreateSubjectAssignmentRequest = {
            groupId: values.groupId,
            subjectId: values.subjectId,
            teacherId: values.teacherId,
          }
          updateMutation.mutate({ record: editingAssignment, payload })
        }}>
          <Form.Item
            name="groupId"
            label="Nhóm sinh viên"
            rules={[{ required: true, message: 'Chọn nhóm sinh viên' }]}
          >
            <Select placeholder="Chọn nhóm" loading={groupsQuery.isLoading}>
              {groupsQuery.data?.map((group) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="subjectId"
            label="Môn học"
            rules={[{ required: true, message: 'Chọn môn học' }]}
          >
            <Select placeholder="Chọn môn học" loading={subjectsQuery.isLoading}>
              {subjectsQuery.data?.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="teacherId"
            label="Chọn giáo viên"
            rules={[{ required: true, message: 'Chọn giáo viên' }]}
          >
            <Select placeholder="Chọn giáo viên" loading={teachersQuery.isLoading}>
              {teachersQuery.data?.map((teacher) => (
                <Select.Option key={teacher.id} value={teacher.id}>
                  {teacher.fullName} ({teacher.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default AdminAssignPage
