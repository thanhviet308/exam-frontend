import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { createPassage, deletePassage, fetchPassages, updatePassage } from '../../api/teacher/passagesApi'
import type { PassageFilter, PassagePayload } from '../../api/teacher/passagesApi'
import type { TeacherPassage } from '../../types'
import { getSubjects, getChapters, getMySubjectAssignments } from '../../api/adminApi'
import { useAuthContext } from '../../context/AuthContext'
import type { SubjectResponse, ChapterResponse, SubjectAssignment } from '../../types/models'

const PassagesPage = () => {
  const { user } = useAuthContext()
  const [filters, setFilters] = useState<PassageFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TeacherPassage | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const passagesQuery = useQuery<TeacherPassage[]>({
    queryKey: ['teacher-passages', filters],
    queryFn: () => fetchPassages(filters),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData, // Keep previous data to prevent flash
    notifyOnChangeProps: ['data', 'error'], // Only re-render on data/error changes, not on loading states
  })

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Use teacher-specific endpoint to get only assignments for current teacher
  const assignmentsQuery = useQuery<SubjectAssignment[]>({
    queryKey: ['subject-assignments', user?.id],
    queryFn: getMySubjectAssignments,
    enabled: !!user && user.role === 'TEACHER',
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const chaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', filters.subjectId],
    queryFn: () => (filters.subjectId ? getChapters(filters.subjectId) : Promise.resolve([])),
    enabled: !!filters.subjectId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  })

  const formChaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', selectedSubjectId],
    queryFn: () => (selectedSubjectId ? getChapters(selectedSubjectId) : Promise.resolve([])),
    enabled: !!selectedSubjectId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const passageMutation = useMutation({
    mutationFn: (values: PassagePayload) => {
      if (editing) {
        return updatePassage(editing.id, values)
      }
      return createPassage(values)
    },
    onSuccess: (data, variables) => {
      message.success(editing ? 'Cập nhật đoạn văn thành công' : 'Thêm đoạn văn thành công')
      // Set filter to match the passage that was just added/updated
      setFilters({
        subjectId: variables.subjectId,
        chapterId: variables.chapterId,
      })
      queryClient.invalidateQueries({ queryKey: ['teacher-passages'] })
      form.resetFields()
      setEditing(null)
      setModalOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePassage(id),
    onSuccess: () => {
      message.success('Đã xóa đoạn văn')
      queryClient.invalidateQueries({ queryKey: ['teacher-passages'] })
    },
  })

  const columns: ColumnsType<TeacherPassage> = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    { title: 'Môn học', dataIndex: 'subjectName' },
    { title: 'Chương', dataIndex: 'chapterName' },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      render: (text: string) => <Typography.Paragraph ellipsis={{ rows: 2 }}>{text}</Typography.Paragraph>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Button
            type="link"
            danger
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(record.id)}
          >
            Xóa
          </Button>
        </Space>
      ),
    },
  ]

  const handleEdit = (record: TeacherPassage) => {
    setEditing(record)
    setSelectedSubjectId(record.subjectId)
    setModalOpen(true)
    form.setFieldsValue({
      subjectId: record.subjectId,
      chapterId: record.chapterId,
      content: record.content,
    })
  }

  const handleAdd = () => {
    setEditing(null)
    setSelectedSubjectId(undefined)
    setModalOpen(true)
    form.resetFields()
  }

  // Calculate unique subjects that teacher is responsible for (based on assignments)
  const assignments = assignmentsQuery.data || []
  const teacherSubjectIds = new Set<number>()
  assignments.forEach((a) => {
    if (a.subjectId) teacherSubjectIds.add(a.subjectId)
  })

  // Filter subjects to only show those the teacher is responsible for
  const availableSubjects = (subjectsQuery.data || []).filter((subject) => teacherSubjectIds.has(subject.id))

  const handleSubmit = (values: { subjectId: number; chapterId: number; content: string }) => {
    const subject = availableSubjects.find((s) => s.id === values.subjectId)
    const chapter = formChaptersQuery.data?.find((c) => c.id === values.chapterId)
    const payload: PassagePayload = {
      subjectId: values.subjectId,
      subjectName: subject?.name ?? '',
      chapterId: values.chapterId,
      chapterName: chapter?.name ?? '',
      content: values.content,
    }
    passageMutation.mutate(payload)
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Quản lý đoạn văn
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Tạo và lưu trữ các đoạn văn dùng chung cho nhiều câu hỏi trắc nghiệm dạng đọc hiểu.
        <br />
        <Typography.Text strong style={{ color: '#1890ff' }}>
          💡 Cách sử dụng:
        </Typography.Text>
        {' '}Sau khi tạo đoạn văn, khi tạo câu hỏi trong "Ngân hàng câu hỏi", bạn có thể chọn đoạn văn này. 
        Khi học sinh làm bài, họ sẽ đọc đoạn văn trước, sau đó trả lời các câu hỏi liên quan đến đoạn văn đó.
      </Typography.Paragraph>
      <Card style={{ borderRadius: 16 }}>
        <Space wrap align="center" style={{ width: '100%' }}>
          <Space>
            <span>Môn học:</span>
            <Select
              placeholder="Chọn môn"
              allowClear
              style={{ width: 200 }}
              value={filters.subjectId}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, subjectId: value, chapterId: undefined }))
              }}
            >
              {availableSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Space>
            <span>Chương:</span>
            <Select
              placeholder="Chọn chương"
              allowClear
              style={{ width: 200 }}
              disabled={!filters.subjectId}
              value={filters.chapterId}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, chapterId: value }))
              }}
            >
              {chaptersQuery.data?.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Tag color="blue">{passagesQuery.data?.length ?? 0} đoạn văn</Tag>
          <div style={{ marginLeft: 'auto' }}>
            <Button type="primary" onClick={handleAdd}>
              Thêm đoạn văn
            </Button>
          </div>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={passagesQuery.data}
          loading={passagesQuery.isFetching && !passagesQuery.data}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Cập nhật đoạn văn' : 'Thêm đoạn văn'}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={passageMutation.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="subjectId"
            label="Môn học"
            rules={[{ required: true, message: 'Chọn môn học' }]}
          >
            <Select
              placeholder="Chọn môn học"
              onChange={(value) => {
                setSelectedSubjectId(value)
                form.setFieldsValue({ chapterId: undefined })
              }}
            >
              {availableSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="chapterId"
            label="Chương"
            rules={[{ required: true, message: 'Chọn chương' }]}
          >
            <Select placeholder="Chọn chương" disabled={!selectedSubjectId}>
              {formChaptersQuery.data?.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={4} placeholder="Nhập đoạn văn" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default PassagesPage
