import { Button, Card, Form, Input, List, Modal, Select, Space, Typography } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamTemplate, Subject } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'
import type { FormListFieldData, FormListOperation } from 'antd/es/form/FormList'

const TemplatesPage = () => {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/subjects')).data,
  })

  const templatesQuery = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      if (!subjectsQuery.data?.length) return []
      const res = await apiClient.get<ExamTemplate[]>('/exam-templates', {
        params: { subjectId: subjectsQuery.data[0].id },
      })
      return res.data
    },
    enabled: Boolean(subjectsQuery.data?.length),
  })

  const createTemplate = useMutation({
    mutationFn: async (values: ExamTemplate) => apiClient.post<ExamTemplate>('/exam-templates', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      setModalOpen(false)
      form.resetFields()
    },
  })

  if (subjectsQuery.isLoading || templatesQuery.isLoading) return <PageSpinner />
  if (templatesQuery.error) {
    return (
      <ErrorState message={(templatesQuery.error as Error).message} onRetry={() => templatesQuery.refetch()} />
    )
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Khung đề thi
        </Typography.Title>
        <Button type="primary" onClick={() => setModalOpen(true)}>
          Tạo template
        </Button>
      </Space>
      <Card>
        <List
          itemLayout="vertical"
          dataSource={templatesQuery.data}
          renderItem={(item: ExamTemplate) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.name} description={`Tổng câu: ${item.totalQuestions}`} />
              <Space direction="vertical">
                {item.structures.map((structure) => (
                  <Typography.Text key={structure.id}>
                    Chapter #{structure.chapterId} - {structure.numQuestion} câu
                  </Typography.Text>
                ))}
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title="Tạo template mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createTemplate.isPending}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={(values: ExamTemplate) => createTemplate.mutate(values)}>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}>
            <Select options={subjectsQuery.data?.map((subject) => ({ label: subject.name, value: subject.id }))} />
          </Form.Item>
          <Form.Item name="name" label="Tên template" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="totalQuestions" label="Tổng câu hỏi" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="Thời lượng (phút)" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
          <Form.List name="structures">
            {(fields: FormListFieldData[], { add, remove }: FormListOperation) => (
              <Card
                size="small"
                title="Cấu trúc chương"
                extra={
                  <Button type="dashed" onClick={() => add()}>
                    Thêm dòng
                  </Button>
                }
              >
                {fields.map((field) => (
                  <Space key={field.key} align="baseline">
                    <Form.Item
                      {...field}
                      name={[field.name, 'chapterId']}
                      label="Chapter ID"
                      rules={[{ required: true }]}
                    >
                      <Input type="number" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'numQuestion']}
                      label="Số câu"
                      rules={[{ required: true }]}
                    >
                      <Input type="number" min={1} />
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

export default TemplatesPage

