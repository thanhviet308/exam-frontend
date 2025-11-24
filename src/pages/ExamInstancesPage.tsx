import { Button, Card, Descriptions, List, Modal, Switch, Typography } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamInstance } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const ExamInstancesPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [formValues, setFormValues] = useState<Partial<ExamInstance>>({})
  const queryClient = useQueryClient()

  const instancesQuery = useQuery({
    queryKey: ['exam-instances'],
    queryFn: async () => (await apiClient.get<ExamInstance[]>('/exam-instances/group/1')).data,
  })

  const createInstance = useMutation({
    mutationFn: async (values: Partial<ExamInstance>) => apiClient.post<ExamInstance>('/exam-instances', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam-instances'] })
      setModalOpen(false)
      setFormValues({})
    },
  })

  if (instancesQuery.isLoading) return <PageSpinner />
  if (instancesQuery.error) {
    return (
      <ErrorState message={(instancesQuery.error as Error).message} onRetry={() => instancesQuery.refetch()} />
    )
  }

  return (
    <>
      <Button type="primary" onClick={() => setModalOpen(true)} style={{ marginBottom: 16 }}>
        Tạo kỳ thi
      </Button>
      <List
        dataSource={instancesQuery.data}
        renderItem={(item: ExamInstance) => (
          <Card key={item.id} style={{ marginBottom: 16 }}>
            <Descriptions title={item.name} column={3}>
              <Descriptions.Item label="Thời gian">
                {new Date(item.startTime).toLocaleString()} - {new Date(item.endTime).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Thời lượng">{item.durationMinutes} phút</Descriptions.Item>
              <Descriptions.Item label="Trộn câu">
                <Switch checked={item.shuffleQuestions} disabled />{' '}
                <Typography.Text style={{ marginLeft: 8 }}>Trộn đáp án: {item.shuffleOptions ? 'Có' : 'Không'}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      />
      <Modal
        title="Tạo kỳ thi"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => createInstance.mutate(formValues)}
        confirmLoading={createInstance.isPending}
      >
        <Typography.Paragraph>Điền template_id, group_id ... (placeholder - cần form chi tiết).</Typography.Paragraph>
      </Modal>
    </>
  )
}

export default ExamInstancesPage

