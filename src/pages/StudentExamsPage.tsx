import { Button, Card, List, Modal, Typography, Tag, message } from 'antd'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamInstance, StartAttemptResponse } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'
import { getMyHistory } from '../api/examApi'
import type { ExamAttemptResponse } from '../types/models'

const StudentExamsPage = () => {
  const [attemptData, setAttemptData] = useState<StartAttemptResponse | null>(null)

  const examsQuery = useQuery({
    queryKey: ['student-exams'],
    queryFn: async () => (await apiClient.get<ExamInstance[]>('/exam-instances/my')).data,
  })

  const historyQuery = useQuery<ExamAttemptResponse[]>({
    queryKey: ['student-exam-history'],
    queryFn: getMyHistory,
  })

  const startAttempt = useMutation({
    mutationFn: async (examId: number) =>
      (await apiClient.post<StartAttemptResponse>(`/exam-attempts/${examId}/start`)).data,
    onSuccess: (data) => {
      setAttemptData(data)
      historyQuery.refetch() // Refresh history after starting
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể bắt đầu bài thi'
      message.error(errorMessage)
    },
  })

  if (examsQuery.isLoading || historyQuery.isLoading) return <PageSpinner />
  if (examsQuery.error) {
    return (
      <ErrorState message={(examsQuery.error as Error).message} onRetry={() => examsQuery.refetch()} />
    )
  }

  // Create a map of exam instance ID to attempt status
  const attemptStatusMap = new Map<number, 'SUBMITTED' | 'GRADED' | 'IN_PROGRESS' | 'NOT_STARTED'>()
  historyQuery.data?.forEach((attempt) => {
    if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED') {
      attemptStatusMap.set(attempt.examInstanceId, attempt.status)
    } else if (attempt.status === 'IN_PROGRESS' && !attemptStatusMap.has(attempt.examInstanceId)) {
      attemptStatusMap.set(attempt.examInstanceId, 'IN_PROGRESS')
    }
  })

  const getExamStatus = (exam: ExamInstance) => {
    const attemptStatus = attemptStatusMap.get(exam.id)
    if (attemptStatus === 'SUBMITTED' || attemptStatus === 'GRADED') {
      return { label: 'Đã hoàn thành', color: 'success', disabled: true }
    }
    if (attemptStatus === 'IN_PROGRESS') {
      return { label: 'Đang làm bài', color: 'processing', disabled: false }
    }
    return { label: 'Chưa bắt đầu', color: 'default', disabled: false }
  }

  return (
    <>
      <Typography.Title level={3}>Kỳ thi của tôi</Typography.Title>
      <List
        dataSource={examsQuery.data}
        renderItem={(item: ExamInstance) => {
          const status = getExamStatus(item)
          return (
            <Card key={item.id} style={{ marginBottom: 16 }}>
              <Typography.Title level={4}>{item.name}</Typography.Title>
              <Typography.Paragraph>
                {new Date(item.startTime).toLocaleString()} - {new Date(item.endTime).toLocaleString()}
              </Typography.Paragraph>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <Tag color={status.color}>{status.label}</Tag>
                <Button
                  type="primary"
                  onClick={() => startAttempt.mutate(item.id)}
                  loading={startAttempt.isPending}
                  disabled={status.disabled}
                >
                  {status.disabled ? 'Đã hoàn thành' : 'Vào thi'}
                </Button>
              </div>
            </Card>
          )
        }}
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

