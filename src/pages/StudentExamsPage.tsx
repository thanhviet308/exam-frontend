import { Button, Card, List, Modal, Typography } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamInstance, StartAttemptResponse } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const StudentExamsPage = () => {
  const [attemptData, setAttemptData] = useState<StartAttemptResponse | null>(null)

  const examsQuery = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => (await apiClient.get<ExamInstance[]>('/exam-instances/my')).data,
  })

  const startAttempt = useMutation({
    mutationFn: async (examId: number) =>
      (await apiClient.post<StartAttemptResponse>(`/exam-attempts/${examId}/start`)).data,
    onSuccess: (data) => setAttemptData(data),
  })

  if (examsQuery.isLoading) return <PageSpinner />
  if (examsQuery.error) {
    return (
      <ErrorState message={(examsQuery.error as Error).message} onRetry={() => examsQuery.refetch()} />
    )
  }

  return (
    <>
      <Typography.Title level={3}>Kỳ thi của tôi</Typography.Title>
      <List
        dataSource={examsQuery.data}
        renderItem={(item: ExamInstance) => (
          <Card key={item.id} style={{ marginBottom: 16 }}>
            <Typography.Title level={4}>{item.name}</Typography.Title>
            <Typography.Paragraph>
              {new Date(item.startTime).toLocaleString()} - {new Date(item.endTime).toLocaleString()}
            </Typography.Paragraph>
            <Button type="primary" onClick={() => startAttempt.mutate(item.id)} loading={startAttempt.isPending}>
              Vào thi
            </Button>
          </Card>
        )}
      />
      <Modal
        open={Boolean(attemptData)}
        onCancel={() => setAttemptData(null)}
        footer={null}
        width={900}
        title="Bài thi"
      >
        {attemptData && (
          <>
            <Typography.Paragraph>Trạng thái: {attemptData.status}</Typography.Paragraph>
            {attemptData.questions.map((question) => (
              <Card key={question.questionId} style={{ marginBottom: 12 }}>
                <Typography.Text strong>
                  {question.content} ({question.marks} điểm)
                </Typography.Text>
                {question.options.map((opt) => (
                  <Typography.Paragraph key={opt.optionId} style={{ marginBottom: 4 }}>
                    - {opt.content}
                  </Typography.Paragraph>
                ))}
              </Card>
            ))}
          </>
        )}
      </Modal>
    </>
  )
}

export default StudentExamsPage

