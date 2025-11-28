import { useState, type MouseEvent } from 'react'
import { Button, Card, Col, Drawer, Form, Input, List, Row, Space, Switch, Typography } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { Chapter, Subject } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const SubjectsPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => (await apiClient.get<Subject[]>('/subjects')).data,
  })

  const chaptersQuery = useQuery({
    queryKey: ['chapters', selectedSubject?.id],
    queryFn: async () =>
      selectedSubject ? (await apiClient.get<Chapter[]>(`/subjects/${selectedSubject.id}/chapters`)).data : [],
    enabled: Boolean(selectedSubject),
  })

  const saveSubject = useMutation({
    mutationFn: async (values: Subject) => {
      if (selectedSubject) {
        return apiClient.put<Subject>(`/subjects/${selectedSubject.id}`, values)
      }
      return apiClient.post<Subject>('/subjects', values)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setDrawerOpen(false)
    },
  })

  if (subjectsQuery.isLoading) return <PageSpinner />
  if (subjectsQuery.error) {
    return (
      <ErrorState message={(subjectsQuery.error as Error).message} onRetry={() => subjectsQuery.refetch()} />
    )
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Môn học & chương
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setSelectedSubject(null)
            form.resetFields()
            form.setFieldValue('active', true)
            setDrawerOpen(true)
          }}
        >
          Thêm môn
        </Button>
      </Space>
      <Row gutter={[16,16]}>
        <Col span={12}>
          <Card title="Danh sách môn" className="card">
            <List
              bordered
              dataSource={subjectsQuery.data}
              renderItem={(item: Subject) => (
                <List.Item
                  onClick={() => {
                    setSelectedSubject(item)
                    chaptersQuery.refetch()
                  }}
                  className={selectedSubject?.id === item.id ? 'list-item-active' : ''}
                  actions={[
                    <Button
                      size="small"
                      key="edit"
                      onClick={(e: MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        setSelectedSubject(item)
                        form.setFieldsValue(item)
                        setDrawerOpen(true)
                      }}
                    >
                      Sửa
                    </Button>,
                  ]}
                >
                  <List.Item.Meta title={item.name} description={item.description} />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Chương thuộc môn" className="card">
            {selectedSubject ? (
              chaptersQuery.isLoading ? (
                <PageSpinner />
              ) : (
                <List
                  dataSource={chaptersQuery.data}
                  renderItem={(chapter: Chapter) => (
                    <List.Item key={chapter.id}>
                      <List.Item.Meta title={chapter.name} description={chapter.description} />
                    </List.Item>
                  )}
                />
              )
            ) : (
              <Typography.Paragraph>Chọn một môn học để xem danh sách chương.</Typography.Paragraph>
            )}
          </Card>
        </Col>
      </Row>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        title={selectedSubject ? 'Cập nhật môn học' : 'Thêm môn học'}
      >
        <Form layout="vertical" form={form} onFinish={(values: Subject) => saveSubject.mutate(values)}>
          <Form.Item name="name" label="Tên môn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={saveSubject.isPending}>
            Lưu
          </Button>
        </Form>
      </Drawer>
    </>
  )
}

export default SubjectsPage

