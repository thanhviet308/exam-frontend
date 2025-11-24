import { useState } from 'react'
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tag, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { Question, QuestionOption, Subject } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'
import type { FormListFieldData, FormListOperation } from 'antd/es/form/FormList'

const questionTypeOptions = [
  { label: 'Trắc nghiệm', value: 'MCQ' },
  { label: 'Điền khuyết', value: 'FILL' },
]

type QuestionPayload = Partial<Question> & {
  options?: QuestionOption[]
  answers?: string[]
}

const QuestionsPage = () => {
  const [filterForm] = Form.useForm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/subjects')).data,
  })

  const questionsQuery = useQuery({
    queryKey: ['questions', filterForm.getFieldsValue()],
    queryFn: async () => {
      const params = filterForm.getFieldsValue()
      const res = await apiClient.get<Question[]>('/questions', { params })
      return res.data
    },
  })

  const saveQuestion = useMutation({
    mutationFn: async (values: QuestionPayload) => {
      if (editing) {
        return apiClient.put<Question>(`/questions/${editing.id}`, values)
      }
      return apiClient.post<Question>('/questions', values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] })
      setModalOpen(false)
      setEditing(null)
    },
  })

  const columns = [
    { title: 'Nội dung', dataIndex: 'content' },
    { title: 'Điểm', dataIndex: 'marks', width: 80 },
    { title: 'Độ khó', dataIndex: 'difficulty', width: 120 },
    {
      title: 'Loại',
      dataIndex: 'questionType',
      render: (type: string) => <Tag color={type === 'MCQ' ? 'blue' : 'purple'}>{type}</Tag>,
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      render: (active: boolean) => (active ? <Tag color="green">Active</Tag> : <Tag color="red">Ẩn</Tag>),
      width: 100,
    },
    {
      title: 'Thao tác',
      width: 120,
      render: (_: unknown, record: Question) => (
        <Button
          size="small"
          onClick={() => {
            setEditing(record)
            form.setFieldsValue(record)
            setModalOpen(true)
          }}
        >
          Sửa
        </Button>
      ),
    },
  ]

  if (questionsQuery.isLoading) return <PageSpinner />
  if (questionsQuery.error) {
    return (
      <ErrorState message={(questionsQuery.error as Error).message} onRetry={() => questionsQuery.refetch()} />
    )
  }

  return (
    <>
      <Typography.Title level={3}>Ngân hàng câu hỏi</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline" form={filterForm} onFinish={() => questionsQuery.refetch()}>
          <Form.Item name="subjectId" label="Môn">
            <Select
              allowClear
              style={{ width: 200 }}
              options={subjectsQuery.data?.map((subject) => ({ label: subject.name, value: subject.id }))}
            />
          </Form.Item>
          <Form.Item name="difficulty" label="Độ khó">
            <Select allowClear style={{ width: 150 }} options={['EASY', 'MEDIUM', 'HARD'].map((d) => ({ value: d }))} />
          </Form.Item>
          <Form.Item name="questionType" label="Loại">
            <Select allowClear style={{ width: 150 }} options={questionTypeOptions} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Lọc
              </Button>
              <Button onClick={() => filterForm.resetFields()}>Xóa</Button>
              <Button type="dashed" onClick={() => setModalOpen(true)}>
                Thêm câu hỏi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      <Table rowKey="id" dataSource={questionsQuery.data} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal
        open={modalOpen}
        title={editing ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={saveQuestion.isPending}
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values: QuestionPayload) => {
            const payload: QuestionPayload = {
              ...values,
              options: values.options?.filter((opt) => opt?.content),
              answers: values.answers?.filter((ans) => ans),
            }
            saveQuestion.mutate(payload)
          }}
        >
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="chapterId" label="Chapter ID" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="questionType" label="Loại" rules={[{ required: true }]}>
            <Select options={questionTypeOptions} />
          </Form.Item>
          <Form.Item name="difficulty" label="Độ khó">
            <Select allowClear options={['EASY', 'MEDIUM', 'HARD'].map((d) => ({ value: d }))} />
          </Form.Item>
          <Form.Item name="marks" label="Điểm" initialValue={1}>
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
          <Form.List name="options">
            {(fields: FormListFieldData[], { add, remove }: FormListOperation) => (
              <Card title="Phương án MCQ" extra={<Button onClick={() => add({ correct: false })}>Thêm</Button>}>
                {fields.map((field, index) => (
                  <Space key={field.key} align="baseline">
                    <Form.Item {...field} name={[field.name, 'content']} rules={[{ required: true }]}>
                      <Input placeholder={`Đáp án ${index + 1}`} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'correct']} valuePropName="checked">
                      <Switch checkedChildren="Đúng" unCheckedChildren="Sai" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Xóa
                    </Button>
                  </Space>
                ))}
              </Card>
            )}
          </Form.List>
          <Form.List name="answers">
            {(fields: FormListFieldData[], { add, remove }: FormListOperation) => (
              <Card title="Đáp án FILL" extra={<Button onClick={() => add()}>Thêm</Button>} style={{ marginTop: 12 }}>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline">
                    <Form.Item {...field} rules={[{ required: true }]}>
                      <Input placeholder="Đáp án" />
                    </Form.Item>
                    <Button danger onClick={() => remove(field.name)}>
                      Xóa
                    </Button>
                  </Space>
                ))}
              </Card>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  )
}

export default QuestionsPage

