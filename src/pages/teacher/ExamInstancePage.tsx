import { useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExamInstance, fetchExamInstances } from '../../api/teacher/examInstanceApi'
import type { ExamInstancePayload } from '../../api/teacher/examInstanceApi'
import type { TeacherExamInstance, TeacherTemplate } from '../../types'
import dayjs from 'dayjs'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { fetchTemplates } from '../../api/teacher/examTemplateApi'
import { getStudentGroups } from '../../api/adminApi'
import type { StudentGroupResponse } from '../../types/models'

const ExamInstancePage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  
  // Watch form values to show end time preview
  const startTime = Form.useWatch('startTime', form)
  const durationMinutes = Form.useWatch('durationMinutes', form)

  const instanceQuery = useQuery<TeacherExamInstance[]>({
    queryKey: ['teacher-exams'],
    queryFn: fetchExamInstances,
  })

  const templatesQuery = useQuery<TeacherTemplate[]>({
    queryKey: ['teacher-templates'],
    queryFn: fetchTemplates,
  })

  const groupsQuery = useQuery<StudentGroupResponse[]>({
    queryKey: ['student-groups'],
    queryFn: getStudentGroups,
  })

  const createMutation = useMutation({
    mutationFn: (payload: ExamInstancePayload) => createExamInstance(payload),
    onSuccess: () => {
      message.success('Đã tạo kỳ thi mới')
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      setModalOpen(false)
      form.resetFields()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể tạo kỳ thi. Vui lòng thử lại.')
    },
  })

  const columns: ColumnsType<TeacherExamInstance> = [
    { title: 'Tên kỳ thi', dataIndex: 'name' },
    { title: 'Khung đề', dataIndex: 'templateName' },
    { title: 'Nhóm sinh viên', dataIndex: 'studentGroupName' },
    {
      title: 'Thời gian',
      render: (_, record) => (
        <span>
          {dayjs(record.startTime).format('DD/MM HH:mm')} - {dayjs(record.endTime).format('HH:mm')}
        </span>
      ),
    },
    { title: 'Thời lượng', dataIndex: 'durationMinutes', render: (value: number) => `${value} phút` },
    {
      title: 'Trộn đề',
      render: (record) => (
        <Space>
          <Tag color={record.shuffleQuestions ? 'green' : 'gray'}>Trộn câu</Tag>
          <Tag color={record.shuffleOptions ? 'green' : 'gray'}>Trộn đáp án</Tag>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: TeacherExamInstance['status']) => {
        const color = status === 'SCHEDULED' ? 'blue' : status === 'ONGOING' ? 'orange' : 'green'
        const labelMap: Record<TeacherExamInstance['status'], string> = {
          SCHEDULED: 'Chưa diễn ra',
          ONGOING: 'Đang diễn ra',
          COMPLETED: 'Đã kết thúc',
        }
        return <Tag color={color}>{labelMap[status]}</Tag>
      },
    },
  ]

  const handleCreate = (values: any) => {
    const template = templatesQuery.data?.find((t) => t.id === values.templateId)
    const group = groupsQuery.data?.find((g) => g.id === values.studentGroupId)
    
    // Tính thời gian kết thúc = thời gian bắt đầu + thời lượng
    const startTime = dayjs(values.startTime)
    const endTime = startTime.add(values.durationMinutes, 'minute')
    
    const payload: ExamInstancePayload = {
      name: values.name,
      templateId: values.templateId,
      templateName: template?.name ?? '',
      studentGroupId: values.studentGroupId,
      studentGroupName: group?.name ?? '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: values.durationMinutes,
      shuffleQuestions: values.shuffleQuestions,
      shuffleOptions: values.shuffleOptions,
    }
    createMutation.mutate(payload)
  }

  if (instanceQuery.isLoading || templatesQuery.isLoading || groupsQuery.isLoading) {
    return <PageSpinner />
  }

  if (instanceQuery.error || templatesQuery.error || groupsQuery.error) {
    const error = (instanceQuery.error || templatesQuery.error || groupsQuery.error) as Error
    return (
      <ErrorState
        message={error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.'}
        onRetry={() => {
          instanceQuery.refetch()
          templatesQuery.refetch()
          groupsQuery.refetch()
        }}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Tổ chức kỳ thi
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Lên lịch các kỳ thi dựa trên khung đề đã tạo và phân công cho từng lớp.
      </Typography.Paragraph>
      <Card
        style={{ borderRadius: 16 }}
        bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
      >
        <div>
          <Typography.Text type="secondary">Tổng số kỳ thi</Typography.Text>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{instanceQuery.data?.length ?? 0}</div>
        </div>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          Tạo kỳ thi mới
        </Button>
      </Card>
      <Card style={{ borderRadius: 16 }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={instanceQuery.data || []}
          loading={instanceQuery.isFetching}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title="Tạo kỳ thi"
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ shuffleQuestions: true, shuffleOptions: true }}
        >
          <Form.Item name="name" label="Tên kỳ thi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="templateId" label="Khung đề" rules={[{ required: true }]}>
            <Select placeholder="Chọn khung đề">
              {templatesQuery.data?.map((template) => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="studentGroupId" label="Nhóm sinh viên" rules={[{ required: true }]}>
            <Select placeholder="Chọn nhóm sinh viên">
              {groupsQuery.data?.map((group) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="startTime" label="Thời gian bắt đầu" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
          </Form.Item>
          <Form.Item 
            name="durationMinutes" 
            label="Thời lượng (phút)" 
            rules={[{ required: true }]}
            extra={
              startTime && durationMinutes
                ? `Kết thúc lúc: ${dayjs(startTime).add(durationMinutes, 'minute').format('DD/MM/YYYY HH:mm')}`
                : ''
            }
          >
            <InputNumber min={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="shuffleQuestions" label="Trộn thứ tự câu" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="shuffleOptions" label="Trộn thứ tự đáp án" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}

export default ExamInstancePage

