import { Card, List, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamAttempt, ExamInstance } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const SupervisorPage = () => {
  const examsQuery = useQuery({
    queryKey: ['supervisor-exams'],
    queryFn: async () => (await apiClient.get<ExamInstance[]>('/supervisor/exams')).data,
  })

  const attemptsQuery = useQuery({
    queryKey: ['supervisor-attempts'],
    queryFn: async () => (await apiClient.get<ExamAttempt[]>('/supervisor/exams/attempts')).data,
  })

  if (examsQuery.isLoading || attemptsQuery.isLoading) return <PageSpinner />
  if (examsQuery.error || attemptsQuery.error) {
    return (
      <ErrorState
        message={(examsQuery.error as Error)?.message ?? (attemptsQuery.error as Error)?.message}
        onRetry={() => {
          examsQuery.refetch()
          attemptsQuery.refetch()
        }}
      />
    )
  }

  return (
    <>
      <Typography.Title level={3}>Ca thi được phân công</Typography.Title>
      <List
        dataSource={examsQuery.data}
        renderItem={(exam: ExamInstance) => (
          <Card key={exam.id} style={{ marginBottom: 16 }}>
            <Typography.Title level={4}>{exam.name}</Typography.Title>
            <Typography.Paragraph>
              {new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}
            </Typography.Paragraph>
          </Card>
        )}
      />
      <Typography.Title level={3}>Trạng thái thí sinh</Typography.Title>
      <List
        dataSource={attemptsQuery.data}
        renderItem={(attempt: ExamAttempt) => (
          <List.Item>
            <Typography.Text>
              {attempt.studentName} - {attempt.status} - điểm: {attempt.score ?? '-'}
            </Typography.Text>
          </List.Item>
        )}
      />
    </>
  )
}

export default SupervisorPage

