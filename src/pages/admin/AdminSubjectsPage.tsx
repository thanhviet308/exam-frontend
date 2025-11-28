import { useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, BookOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getChapters,
  createChapter,
  updateChapter,
} from '../../api/adminApi'
import type { SubjectResponse, SubjectRequest, ChapterResponse, ChapterRequest } from '../../types/models'
import { ErrorState, PageSpinner } from '../../components/Loaders'

const AdminSubjectsPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SubjectResponse | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  
  // Chapters management
  const [chaptersDrawerOpen, setChaptersDrawerOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<SubjectResponse | null>(null)
  const [chapterModalOpen, setChapterModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterResponse | null>(null)
  const [chapterForm] = Form.useForm()

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['admin-subjects'],
    queryFn: getSubjects,
  })

  const createMutation = useMutation({
    mutationFn: (payload: SubjectRequest) => createSubject(payload),
    onSuccess: () => {
      message.success('Đã tạo môn học mới')
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })
      form.resetFields()
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SubjectRequest }) => updateSubject(id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật môn học')
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })
      form.resetFields()
      setEditing(null)
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubject(id),
    onSuccess: () => {
      message.success('Đã xóa môn học')
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (subject: SubjectResponse) =>
      updateSubject(subject.id, {
        name: subject.name,
        description: subject.description,
        active: !subject.active,
      }),
    onSuccess: () => {
      message.success('Đã cập nhật trạng thái')
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })
    },
  })

  // Chapters queries and mutations
  const chaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', selectedSubject?.id],
    queryFn: () => (selectedSubject ? getChapters(selectedSubject.id) : Promise.resolve([])),
    enabled: !!selectedSubject && chaptersDrawerOpen,
  })

  const createChapterMutation = useMutation({
    mutationFn: (payload: ChapterRequest) => createChapter(payload),
    onSuccess: () => {
      message.success('Đã tạo chương mới')
      // Invalidate all chapters queries to ensure teacher pages see the new chapter
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      if (selectedSubject?.id) {
        queryClient.invalidateQueries({ queryKey: ['chapters', selectedSubject.id] })
      }
      chapterForm.resetFields()
      setChapterModalOpen(false)
    },
  })

  const updateChapterMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChapterRequest }) => updateChapter(id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật chương')
      // Invalidate all chapters queries to ensure teacher pages see the updated chapter
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      if (selectedSubject?.id) {
        queryClient.invalidateQueries({ queryKey: ['chapters', selectedSubject.id] })
      }
      chapterForm.resetFields()
      setEditingChapter(null)
      setChapterModalOpen(false)
    },
  })

  const columns: ColumnsType<SubjectResponse> = [
    { title: 'Tên môn học', dataIndex: 'name', width: 200 },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      ellipsis: true,
      render: (text?: string) => text || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      width: 120,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'default'}>{active ? 'Hoạt động' : 'Tạm khóa'}</Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 180,
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Thao tác',
      width: 280,
      render: (_: unknown, record) => (
        <Space>
          <Button type="link" icon={<BookOutlined />} onClick={() => handleManageChapters(record)}>
            Quản lý chương
          </Button>
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Button
            type="link"
            onClick={() => toggleMutation.mutate(record)}
            loading={toggleMutation.isPending}
          >
            {record.active ? 'Khóa' : 'Kích hoạt'}
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa môn học này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
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

  const handleEdit = (subject: SubjectResponse) => {
    setEditing(subject)
    setModalOpen(true)
    form.setFieldsValue({
      name: subject.name,
      description: subject.description,
      active: subject.active,
    })
  }

  const handleAdd = () => {
    setEditing(null)
    setModalOpen(true)
    form.resetFields()
    form.setFieldsValue({ active: true })
  }

  const handleSubmit = (values: { name: string; description?: string; active: boolean }) => {
    const payload: SubjectRequest = {
      name: values.name,
      description: values.description,
      active: values.active,
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleManageChapters = (subject: SubjectResponse) => {
    setSelectedSubject(subject)
    setChaptersDrawerOpen(true)
  }

  const handleAddChapter = () => {
    setEditingChapter(null)
    setChapterModalOpen(true)
    chapterForm.resetFields()
    if (selectedSubject) {
      chapterForm.setFieldsValue({ subjectId: selectedSubject.id })
    }
  }

  const handleEditChapter = (chapter: ChapterResponse) => {
    setEditingChapter(chapter)
    setChapterModalOpen(true)
    chapterForm.setFieldsValue({
      subjectId: chapter.subjectId,
      name: chapter.name,
      description: chapter.description,
    })
  }

  const handleSubmitChapter = (values: { subjectId: number; name: string; description?: string }) => {
    const payload: ChapterRequest = {
      subjectId: values.subjectId,
      name: values.name,
      description: values.description,
    }
    if (editingChapter) {
      updateChapterMutation.mutate({ id: editingChapter.id, payload })
    } else {
      createChapterMutation.mutate(payload)
    }
  }

  const chapterColumns: ColumnsType<ChapterResponse> = [
    { title: 'Tên chương', dataIndex: 'name', width: 200 },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      ellipsis: true,
      render: (text?: string) => text || <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Thao tác',
      width: 120,
      render: (_: unknown, record) => (
        <Button type="link" onClick={() => handleEditChapter(record)}>
          Sửa
        </Button>
      ),
    },
  ]

  if (subjectsQuery.isLoading) {
    return <PageSpinner />
  }

  if (subjectsQuery.error) {
    return (
      <ErrorState
        message={(subjectsQuery.error as Error).message || 'Không thể tải danh sách môn học'}
        onRetry={() => subjectsQuery.refetch()}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Quản lý môn học</Typography.Title>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm môn học mới
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={subjectsQuery.data || []}
          loading={subjectsQuery.isFetching}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Cập nhật môn học' : 'Thêm môn học mới'}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên môn học" rules={[{ required: true, message: 'Nhập tên môn học' }]}>
            <Input placeholder="Ví dụ: Toán học" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Nhập mô tả môn học (tùy chọn)" />
          </Form.Item>
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Chapters Management Drawer */}
      <Drawer
        title={`Quản lý chương - ${selectedSubject?.name || ''}`}
        open={chaptersDrawerOpen}
        onClose={() => {
          setChaptersDrawerOpen(false)
          setSelectedSubject(null)
        }}
        width={600}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddChapter}>
            Thêm chương mới
          </Button>
          {chaptersQuery.isLoading ? (
            <PageSpinner />
          ) : chaptersQuery.error ? (
            <ErrorState
              message={(chaptersQuery.error as Error).message || 'Không thể tải danh sách chương'}
              onRetry={() => chaptersQuery.refetch()}
            />
          ) : (
            <Table
              rowKey="id"
              columns={chapterColumns}
              dataSource={chaptersQuery.data || []}
              loading={chaptersQuery.isFetching}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: 'Chưa có chương nào' }}
            />
          )}
        </Space>
      </Drawer>

      {/* Chapter Modal */}
      <Modal
        open={chapterModalOpen}
        title={editingChapter ? 'Cập nhật chương' : 'Thêm chương mới'}
        onCancel={() => {
          setChapterModalOpen(false)
          setEditingChapter(null)
        }}
        onOk={() => chapterForm.submit()}
        confirmLoading={createChapterMutation.isPending || updateChapterMutation.isPending}
        destroyOnClose
      >
        <Form layout="vertical" form={chapterForm} onFinish={handleSubmitChapter}>
          <Form.Item name="subjectId" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="name" label="Tên chương" rules={[{ required: true, message: 'Nhập tên chương' }]}>
            <Input placeholder="Ví dụ: Đại số cơ bản" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Nhập mô tả chương (tùy chọn)" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default AdminSubjectsPage
