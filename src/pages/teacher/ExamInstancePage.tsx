import { useState } from 'react'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
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
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createExamInstance, updateExamInstance, deleteExamInstance, fetchExamInstances } from '../../api/teacher/examInstanceApi'
import type { ExamInstancePayload } from '../../api/teacher/examInstanceApi'
import type { TeacherExamInstance, TeacherTemplate } from '../../types'
import dayjs from 'dayjs'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { fetchTemplates } from '../../api/teacher/examTemplateApi'
import { getStudentGroups, getUsersByRole } from '../../api/adminApi'
import type { StudentGroupResponse, UserResponse } from '../../types/models'
import { assignSupervisorsToExam } from '../../api/examApi'

const ExamInstancePage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<TeacherExamInstance | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assigningInstanceId, setAssigningInstanceId] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [assignForm] = Form.useForm()
  const queryClient = useQueryClient()

  // Watch form values to show end time preview
  const startTime = Form.useWatch('startTime', form)
  const durationMinutes = Form.useWatch('durationMinutes', form)
  const editStartTime = Form.useWatch('startTime', editForm)
  const editDurationMinutes = Form.useWatch('durationMinutes', editForm)

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

  const supervisorsQuery = useQuery<UserResponse[]>({
    queryKey: ['supervisors'],
    queryFn: () => getUsersByRole('SUPERVISOR'),
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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExamInstancePayload }) => updateExamInstance(id, payload),
    onSuccess: () => {
      message.success('Đã cập nhật kỳ thi')
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      queryClient.invalidateQueries({ queryKey: ['supervisor-sessions'] })
      setEditModalOpen(false)
      setEditingInstance(null)
      editForm.resetFields()
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể cập nhật kỳ thi. Vui lòng thử lại.'
      message.error(errorMessage)
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ examInstanceId, supervisors }: { examInstanceId: number; supervisors: Array<{ supervisorId: number }> }) =>
      assignSupervisorsToExam(examInstanceId, supervisors),
    onSuccess: () => {
      message.success('Đã gán giám thị thành công')
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      // Invalidate supervisor queries so they see the new assignment immediately
      queryClient.invalidateQueries({ queryKey: ['supervisor-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['supervisor-monitor'] })
      setAssignModalOpen(false)
      assignForm.resetFields()
      setAssigningInstanceId(null)
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể gán giám thị. Vui lòng thử lại.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExamInstance(id),
    onSuccess: () => {
      message.success('Đã xóa kỳ thi')
      queryClient.invalidateQueries({ queryKey: ['teacher-exams'] })
      queryClient.invalidateQueries({ queryKey: ['supervisor-sessions'] })
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể xóa kỳ thi. Vui lòng thử lại.'
      message.error(errorMessage)
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
    {
      title: 'Giám thị',
      width: 150,
      render: (_: unknown, record: any) => {
        const supervisors = (record as any).supervisors || []
        if (supervisors.length === 0) {
          return <Tag color="red">Chưa có</Tag>
        }
        return (
          <Space direction="vertical" size={4}>
            {supervisors.map((s: any, idx: number) => (
              <Tag key={idx}>{s.fullName || `Giám thị ${idx + 1}`}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Thao tác',
      width: 200,
      render: (_: unknown, record: any) => {
        const supervisors = (record as any).supervisors || []
        const hasNoSupervisor = supervisors.length === 0
        const isCompleted = record.status === 'COMPLETED'
        const isOngoing = record.status === 'ONGOING'
        const now = dayjs()
        const startTime = dayjs(record.startTime)
        const hasStarted = startTime.isBefore(now) || startTime.isSame(now)
        return (
          <Space>
            <Button
              type={hasNoSupervisor && !isCompleted ? 'primary' : 'default'}
              danger={hasNoSupervisor && !isCompleted}
              size="small"
              disabled={isCompleted}
              onClick={() => {
                setAssigningInstanceId(record.id)
                assignForm.resetFields()
                assignForm.setFieldsValue({
                  supervisors: supervisors.map((s: any) => ({
                    supervisorId: s.userId,
                  })) || [],
                })
                setAssignModalOpen(true)
              }}
              title={isCompleted ? 'Kỳ thi đã kết thúc, không thể gán giám thị' : undefined}
            >
              {hasNoSupervisor && !isCompleted ? '⚠️ Gán giám thị' : 'Gán giám thị'}
            </Button>
            <Button
              type="link"
              size="small"
              disabled={isCompleted}
              onClick={() => {
                setEditingInstance(record)
                editForm.resetFields()
                editForm.setFieldsValue({
                  name: record.name,
                  templateId: templatesQuery.data?.find(t => t.name === record.templateName)?.id,
                  studentGroupId: groupsQuery.data?.find(g => g.name === record.studentGroupName)?.id,
                  startTime: dayjs(record.startTime),
                  durationMinutes: record.durationMinutes,
                  totalMarks: (record as any).totalMarks || 10,
                  shuffleQuestions: record.shuffleQuestions,
                  shuffleOptions: record.shuffleOptions,
                  supervisors: (record as any).supervisors?.map((s: any) => ({
                    supervisorId: s.userId,
                  })) || [],
                })
                setEditModalOpen(true)
              }}
              title={isCompleted ? 'Kỳ thi đã kết thúc, không thể sửa' : isOngoing ? 'Kỳ thi đang diễn ra, một số trường không thể sửa' : undefined}
            >
              Sửa
            </Button>
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc muốn xóa kỳ thi này? Tất cả bài làm của học sinh sẽ bị xóa và không thể hoàn tác."
              onConfirm={() => deleteMutation.mutate(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                size="small"
                loading={deleteMutation.isPending}
              >
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  const handleCreate = (values: any) => {
    const template = templatesQuery.data?.find((t) => t.id === values.templateId)
    const group = groupsQuery.data?.find((g) => g.id === values.studentGroupId)

    // Tính thời gian kết thúc = thời gian bắt đầu + thời lượng
    const startTime = dayjs(values.startTime)
    const endTime = startTime.add(values.durationMinutes, 'minute')

    // Map supervisors từ form values
    const supervisors = (values.supervisors || []).map((s: { supervisorId: number }) => ({
      supervisorId: s.supervisorId,
    }))

    const payload: ExamInstancePayload = {
      name: values.name,
      templateId: values.templateId,
      templateName: template?.name ?? '',
      studentGroupId: values.studentGroupId,
      studentGroupName: group?.name ?? '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: values.durationMinutes,
      totalMarks: values.totalMarks,
      shuffleQuestions: values.shuffleQuestions,
      shuffleOptions: values.shuffleOptions,
      supervisors,
    }
    createMutation.mutate(payload)
  }

  const handleUpdate = (values: any) => {
    if (!editingInstance) return

    const template = templatesQuery.data?.find((t) => t.id === values.templateId)
    const group = groupsQuery.data?.find((g) => g.id === values.studentGroupId)

    // Tính thời gian kết thúc = thời gian bắt đầu + thời lượng
    const startTime = dayjs(values.startTime)
    const endTime = startTime.add(values.durationMinutes, 'minute')

    // Map supervisors từ form values
    const supervisors = (values.supervisors || []).map((s: { supervisorId: number }) => ({
      supervisorId: s.supervisorId,
    }))

    const payload: ExamInstancePayload = {
      name: values.name,
      templateId: values.templateId,
      templateName: template?.name ?? '',
      studentGroupId: values.studentGroupId,
      studentGroupName: group?.name ?? '',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes: values.durationMinutes,
      totalMarks: values.totalMarks,
      shuffleQuestions: values.shuffleQuestions,
      shuffleOptions: values.shuffleOptions,
      supervisors,
    }
    updateMutation.mutate({ id: editingInstance.id, payload })
  }

  if (instanceQuery.isLoading || templatesQuery.isLoading || groupsQuery.isLoading || supervisorsQuery.isLoading) {
    return <PageSpinner />
  }

  if (instanceQuery.error || templatesQuery.error || groupsQuery.error || supervisorsQuery.error) {
    const error = (instanceQuery.error || templatesQuery.error || groupsQuery.error || supervisorsQuery.error) as Error
    return (
      <ErrorState
        message={error.message || 'Không thể tải dữ liệu. Vui lòng thử lại.'}
        onRetry={() => {
          instanceQuery.refetch()
          templatesQuery.refetch()
          groupsQuery.refetch()
          supervisorsQuery.refetch()
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
        {instanceQuery.data && instanceQuery.data.some((inst: any) => !inst.supervisors || inst.supervisors.length === 0) && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
            <Typography.Text type="warning" strong>
              ⚠️ Lưu ý: Có một số kỳ thi chưa được gán giám thị. Vui lòng click nút "Gán giám thị" ở cột "Thao tác" để phân công giám thị cho các kỳ thi này.
            </Typography.Text>
          </div>
        )}
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
          <Form.Item
            name="startTime"
            label="Thời gian bắt đầu"
            rules={[
              { required: true, message: 'Vui lòng chọn thời gian bắt đầu' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.resolve()
                  }
                  const selectedTime = dayjs(value)
                  const now = dayjs()
                  if (selectedTime.isBefore(now)) {
                    return Promise.reject(new Error('Thời gian bắt đầu không được là thời gian trong quá khứ'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="DD/MM/YYYY HH:mm"
              disabledDate={(current) => {
                // Disable all dates before today
                return current && current < dayjs().startOf('day')
              }}
              disabledTime={(current) => {
                if (!current) {
                  return {}
                }
                // If selected date is today, disable past hours and minutes
                if (current.isSame(dayjs(), 'day')) {
                  const now = dayjs()
                  const currentHour = now.hour()
                  const currentMinute = now.minute()

                  return {
                    disabledHours: () => {
                      const hours = []
                      for (let i = 0; i < currentHour; i++) {
                        hours.push(i)
                      }
                      return hours
                    },
                    disabledMinutes: (selectedHour: number) => {
                      if (selectedHour === currentHour) {
                        const minutes = []
                        for (let i = 0; i <= currentMinute; i++) {
                          minutes.push(i)
                        }
                        return minutes
                      }
                      return []
                    },
                  }
                }
                return {}
              }}
              placeholder="Chọn thời gian bắt đầu"
            />
          </Form.Item>
          <Form.Item
            name="durationMinutes"
            label="Thời lượng (phút)"
            rules={[
              { required: true, message: 'Vui lòng nhập thời lượng' },
              { type: 'number', min: 1, message: 'Thời lượng phải lớn hơn 0' }
            ]}
            extra={
              startTime && durationMinutes
                ? `Kết thúc lúc: ${dayjs(startTime).add(durationMinutes, 'minute').format('DD/MM/YYYY HH:mm')}`
                : ''
            }
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="totalMarks"
            label="Tổng điểm"
            rules={[{ required: true, message: 'Nhập tổng điểm của đề thi' }]}
            extra="Ví dụ: 40 câu hỏi, tổng điểm 10 → mỗi câu = 0.25 điểm"
          >
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="shuffleQuestions" label="Trộn thứ tự câu" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="shuffleOptions" label="Trộn thứ tự đáp án" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.List name="supervisors">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Typography.Text strong>Phân công giám thị</Typography.Text>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
                    Thêm giám thị
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'supervisorId']}
                      rules={[{ required: true, message: 'Chọn giám thị' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select placeholder="Chọn giám thị" style={{ width: 200 }}>
                        {supervisorsQuery.data?.map((supervisor) => (
                          <Select.Option key={supervisor.id} value={supervisor.id}>
                            {supervisor.fullName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                {fields.length === 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Chưa có giám thị nào được phân công. Nhấn "Thêm giám thị" để thêm.
                  </Typography.Text>
                )}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        open={editModalOpen}
        title="Sửa kỳ thi"
        onCancel={() => {
          setEditModalOpen(false)
          setEditingInstance(null)
          editForm.resetFields()
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        width={700}
      >
        {editingInstance && (
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleUpdate}
            initialValues={{ shuffleQuestions: true, shuffleOptions: true }}
          >
            {(() => {
              const now = dayjs()
              const startTime = editingInstance.startTime ? dayjs(editingInstance.startTime) : null
              const hasStarted = startTime ? (startTime.isBefore(now) || startTime.isSame(now)) : false
              const isOngoing = editingInstance.status === 'ONGOING'
              
              return (
                <>
                  {isOngoing && (
                    <div style={{ marginBottom: 16, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8 }}>
                      <Typography.Text type="warning" strong>
                        ⚠️ Kỳ thi đang diễn ra. Một số trường không thể sửa để đảm bảo tính công bằng.
                      </Typography.Text>
                    </div>
                  )}
                  <Form.Item name="name" label="Tên kỳ thi" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item 
                    name="templateId" 
                    label="Khung đề" 
                    rules={[{ required: true }]}
                  >
                    <Select 
                      placeholder="Chọn khung đề"
                      disabled={hasStarted && isOngoing}
                    >
                      {templatesQuery.data?.map((template) => (
                        <Select.Option key={template.id} value={template.id}>
                          {template.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="studentGroupId" label="Nhóm sinh viên" rules={[{ required: true }]}>
                    <Select placeholder="Chọn nhóm sinh viên" disabled={hasStarted && isOngoing}>
                      {groupsQuery.data?.map((group) => (
                        <Select.Option key={group.id} value={group.id}>
                          {group.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name="startTime"
                    label="Thời gian bắt đầu"
                    rules={[
                      { required: true, message: 'Vui lòng chọn thời gian bắt đầu' },
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.resolve()
                          }
                          const selectedTime = dayjs(value)
                          const now = dayjs()
                          if (selectedTime.isBefore(now) && !hasStarted) {
                            return Promise.reject(new Error('Thời gian bắt đầu không được là thời gian trong quá khứ'))
                          }
                          return Promise.resolve()
                        },
                      },
                    ]}
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY HH:mm"
                      disabled={hasStarted && isOngoing}
                      disabledDate={(current) => {
                        if (hasStarted && isOngoing) return true
                        return current && current < dayjs().startOf('day')
                      }}
                      disabledTime={(current) => {
                        if (hasStarted && isOngoing) {
                          return {
                            disabledHours: () => Array.from({ length: 24 }, (_, i) => i),
                            disabledMinutes: () => Array.from({ length: 60 }, (_, i) => i),
                          }
                        }
                        if (!current) {
                          return {}
                        }
                        if (current.isSame(dayjs(), 'day')) {
                          const now = dayjs()
                          const currentHour = now.hour()
                          const currentMinute = now.minute()

                          return {
                            disabledHours: () => {
                              const hours = []
                              for (let i = 0; i < currentHour; i++) {
                                hours.push(i)
                              }
                              return hours
                            },
                            disabledMinutes: (selectedHour: number) => {
                              if (selectedHour === currentHour) {
                                const minutes = []
                                for (let i = 0; i <= currentMinute; i++) {
                                  minutes.push(i)
                                }
                                return minutes
                              }
                              return []
                            },
                          }
                        }
                        return {}
                      }}
                      placeholder="Chọn thời gian bắt đầu"
                    />
                  </Form.Item>
                  <Form.Item
                    name="durationMinutes"
                    label="Thời lượng (phút)"
                    rules={[
                      { required: true, message: 'Vui lòng nhập thời lượng' },
                      { type: 'number', min: 1, message: 'Thời lượng phải lớn hơn 0' }
                    ]}
                    extra={
                      editStartTime && editDurationMinutes
                        ? `Kết thúc lúc: ${dayjs(editStartTime).add(editDurationMinutes, 'minute').format('DD/MM/YYYY HH:mm')}`
                        : ''
                    }
                  >
                    <InputNumber 
                      min={1} 
                      style={{ width: '100%' }} 
                      disabled={hasStarted && isOngoing}
                    />
                  </Form.Item>
                  <Form.Item
                    name="totalMarks"
                    label="Tổng điểm"
                    rules={[{ required: true, message: 'Nhập tổng điểm của đề thi' }]}
                    extra="Ví dụ: 40 câu hỏi, tổng điểm 10 → mỗi câu = 0.25 điểm"
                  >
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="shuffleQuestions" label="Trộn thứ tự câu" valuePropName="checked">
                    <Switch disabled={hasStarted && isOngoing} />
                  </Form.Item>
                  <Form.Item name="shuffleOptions" label="Trộn thứ tự đáp án" valuePropName="checked">
                    <Switch disabled={hasStarted && isOngoing} />
                  </Form.Item>
                  <Form.List name="supervisors">
                    {(fields, { add, remove }) => (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Typography.Text strong>Phân công giám thị</Typography.Text>
                          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
                            Thêm giám thị
                          </Button>
                        </div>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restField}
                              name={[name, 'supervisorId']}
                              rules={[{ required: true, message: 'Chọn giám thị' }]}
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <Select placeholder="Chọn giám thị" style={{ width: 200 }}>
                                {supervisorsQuery.data?.map((supervisor) => (
                                  <Select.Option key={supervisor.id} value={supervisor.id}>
                                    {supervisor.fullName}
                                  </Select.Option>
                                ))}
                              </Select>
                            </Form.Item>
                            <MinusCircleOutlined onClick={() => remove(name)} />
                          </Space>
                        ))}
                        {fields.length === 0 && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            Chưa có giám thị nào được phân công. Nhấn "Thêm giám thị" để thêm.
                          </Typography.Text>
                        )}
                      </>
                    )}
                  </Form.List>
                </>
              )
            })()}
          </Form>
        )}
      </Modal>

      <Modal
        open={assignModalOpen}
        title="Gán giám thị"
        onCancel={() => {
          setAssignModalOpen(false)
          assignForm.resetFields()
          setAssigningInstanceId(null)
        }}
        onOk={() => assignForm.submit()}
        confirmLoading={assignMutation.isPending}
        width={600}
      >
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={(values) => {
            if (!assigningInstanceId) return
            const supervisors = (values.supervisors || []).map((s: { supervisorId: number }) => ({
              supervisorId: s.supervisorId,
            }))
            assignMutation.mutate({ examInstanceId: assigningInstanceId, supervisors })
          }}
        >
          <Form.List name="supervisors">
            {(fields, { add, remove }) => (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Typography.Text strong>Phân công giám thị</Typography.Text>
                  <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
                    Thêm giám thị
                  </Button>
                </div>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'supervisorId']}
                      rules={[{ required: true, message: 'Chọn giám thị' }]}
                      style={{ flex: 1, marginBottom: 0 }}
                    >
                      <Select placeholder="Chọn giám thị" style={{ width: 200 }}>
                        {supervisorsQuery.data?.map((supervisor) => (
                          <Select.Option key={supervisor.id} value={supervisor.id}>
                            {supervisor.fullName}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} />
                  </Space>
                ))}
                {fields.length === 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Chưa có giám thị nào được phân công. Nhấn "Thêm giám thị" để thêm.
                  </Typography.Text>
                )}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Space>
  )
}

export default ExamInstancePage

