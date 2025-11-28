import { useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemplate,
  fetchTemplates,
} from '../../api/teacher/examTemplateApi'
import type { TemplatePayload, TemplateStructureUpdate } from '../../api/teacher/examTemplateApi'
import type { TeacherTemplate } from '../../types'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { getSubjects, getChapters } from '../../api/adminApi'
import type { SubjectResponse, ChapterResponse } from '../../types/models'

const ExamTemplatePage = () => {
  const [createModal, setCreateModal] = useState(false)
  const [structureDrawer, setStructureDrawer] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TeacherTemplate | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [structureForm] = Form.useForm()
  const [createForm] = Form.useForm()
  const queryClient = useQueryClient()

  const templateQuery = useQuery<TeacherTemplate[]>({
    queryKey: ['teacher-templates'],
    queryFn: fetchTemplates,
    refetchOnWindowFocus: false,
    retry: 2, // Retry 2 times on failure
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
  })

  const chaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', selectedSubjectId],
    queryFn: () => (selectedSubjectId ? getChapters(selectedSubjectId) : Promise.resolve([])),
    enabled: !!selectedSubjectId,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true, // Refetch when window gains focus
  })

  const createMutation = useMutation({
    mutationFn: (payload: TemplatePayload) => createTemplate(payload),
    onSuccess: () => {
      message.success('Đã tạo khung đề')
      queryClient.invalidateQueries({ queryKey: ['teacher-templates'] })
      createForm.resetFields()
      setCreateModal(false)
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể tạo khung đề. Vui lòng thử lại.')
    },
  })

  const structureMutation = useMutation({
    mutationFn: async (_payload: { templateId: number; structure: TemplateStructureUpdate }) => {
      // Backend không hỗ trợ update structure, chỉ có thể tạo mới template với structure
      throw new Error('Cập nhật cấu trúc template hiện chưa được hỗ trợ. Vui lòng tạo template mới với cấu trúc mong muốn.')
    },
    onSuccess: () => {
      message.success('Đã cập nhật cấu trúc đề')
      queryClient.invalidateQueries({ queryKey: ['teacher-templates'] })
      setStructureDrawer(false)
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể cập nhật cấu trúc đề. Vui lòng thử lại.')
    },
  })

  const columns: ColumnsType<TeacherTemplate> = [
    { title: 'Tên đề', dataIndex: 'name' },
    { title: 'Môn học', dataIndex: 'subjectName' },
    { title: 'Số câu', dataIndex: 'totalQuestions' },
    { title: 'Thời lượng (phút)', dataIndex: 'durationMinutes' },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Button type="link" onClick={() => openStructureDrawer(record)}>
          Cấu trúc chương
        </Button>
      ),
    },
  ]

  const openStructureDrawer = async (template: TeacherTemplate) => {
    setSelectedTemplate(template)
    setSelectedSubjectId(template.subjectId)
    setStructureDrawer(true)
    
    // Fetch chapters for this subject
    const chapters = await getChapters(template.subjectId)
    structureForm.setFieldsValue({
      chapters: chapters.map((chapter) => ({
        chapterId: chapter.id,
        chapterName: chapter.name,
        numQuestion:
          template.structure.find((item) => item.chapterId === chapter.id)?.numQuestion ?? 0,
      })),
    })
  }

  const handleStructureSave = (values: { chapters: TemplateStructureUpdate }) => {
    if (!selectedTemplate) return
    structureMutation.mutate({ templateId: selectedTemplate.id, structure: values.chapters })
  }

  const handleCreate = (values: any) => {
    const subject = subjectsQuery.data?.find((s) => s.id === values.subjectId)
    const payload: TemplatePayload = {
      subjectId: values.subjectId,
      subjectName: subject?.name ?? '',
      name: values.name,
      totalQuestions: values.totalQuestions,
      durationMinutes: values.durationMinutes,
    }
    createMutation.mutate(payload)
  }

  if (templateQuery.isLoading || subjectsQuery.isLoading) {
    return <PageSpinner />
  }

  if (templateQuery.error || subjectsQuery.error) {
    const error = (templateQuery.error || subjectsQuery.error) as Error
    return (
      <ErrorState
        message={error.message || 'Không thể tải danh sách khung đề. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.'}
        onRetry={() => {
          templateQuery.refetch()
          subjectsQuery.refetch()
        }}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Khung đề</Typography.Title>
      <Button type="primary" onClick={() => setCreateModal(true)}>
        Tạo khung đề
      </Button>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={templateQuery.data || []}
          loading={templateQuery.isFetching}
        />
      </Card>

      <Modal
        open={createModal}
        title="Tạo khung đề mới"
        onCancel={() => setCreateModal(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form layout="vertical" form={createForm} onFinish={handleCreate}>
          <Form.Item
            name="subjectId"
            label="Môn học"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Chọn môn học"
              onChange={(value) => setSelectedSubjectId(value)}
            >
              {subjectsQuery.data?.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Tên đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="totalQuestions"
            label="Tổng số câu"
            rules={[{ required: true, message: 'Nhập số câu hỏi' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={[{ required: true }]}>
            <InputNumber min={10} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={structureDrawer}
        title={`Cấu trúc đề - ${selectedTemplate?.name ?? ''}`}
        width={480}
        onClose={() => setStructureDrawer(false)}
        extra={<Tag color="blue">{selectedTemplate?.subjectName}</Tag>}
      >
        <Typography.Paragraph>
          Phân bổ số câu hỏi cho từng chương thuộc môn học này.
        </Typography.Paragraph>
        <Form layout="vertical" form={structureForm} onFinish={handleStructureSave}>
          <Form.List name="chapters">
            {(fields) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.length === 0 && chaptersQuery.isLoading && (
                  <div>Đang tải danh sách chương...</div>
                )}
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ width: '100%' }}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'chapterName']}
                      fieldKey={[field.fieldKey!, 'chapterName']}
                      label="Chương"
                      style={{ flex: 1 }}
                    >
                      <Input readOnly />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'numQuestion']}
                      fieldKey={[field.fieldKey!, 'numQuestion']}
                      label="Số câu"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={0} />
                    </Form.Item>
                  </Space>
                ))}
              </Space>
            )}
          </Form.List>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => structureForm.submit()} loading={structureMutation.isPending}>
              Lưu cấu trúc
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  )
}

export default ExamTemplatePage

