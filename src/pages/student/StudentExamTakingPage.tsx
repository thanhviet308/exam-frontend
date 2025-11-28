import { useState, useEffect, useRef } from 'react'
import { Button, Card, Input, Layout, Modal, Radio, Space, Typography, message } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { startAttempt, submitAttempt } from '../../api/examApi'
import type { StartAttemptResponse } from '../../types/models'
import dayjs from 'dayjs'

const { Header, Content, Sider } = Layout

type ExamAnswer = {
  questionId: number
  answer?: string // For FILL
  optionId?: number // For MCQ
}

const StudentExamTakingPage = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const hasSubmittedRef = useRef(false)
  const attemptIdRef = useRef<number | null>(null)

  const examQuery = useQuery<StartAttemptResponse>({
    queryKey: ['student-exam-start', examId],
    queryFn: () => startAttempt(Number(examId)),
    enabled: Boolean(examId),
    staleTime: Infinity, // Don't refetch during exam
  })

  // Store attemptId when exam starts
  useEffect(() => {
    if (examQuery.data?.attemptId) {
      attemptIdRef.current = examQuery.data.attemptId
    }
  }, [examQuery.data])

  const submitMutation = useMutation({
    mutationFn: (attemptId: number) => submitAttempt(attemptId),
    onSuccess: () => {
      message.success('Đã nộp bài thành công')
      navigate(`/student/exams/${examId}/result`)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi nộp bài')
    },
  })

  useEffect(() => {
    if (examQuery.data && !hasSubmittedRef.current) {
      const expiresAt = dayjs(examQuery.data.expiresAt)
      const updateTimer = () => {
        const remaining = expiresAt.diff(dayjs(), 'second')
        setTimeRemaining(Math.max(0, remaining))
        if (remaining <= 0 && !hasSubmittedRef.current) {
          handleAutoSubmit()
        }
      }
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [examQuery.data])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (questionId: number, value: string | number) => {
    const question = examQuery.data?.questions.find((q) => q.questionId === questionId)
    if (!question) return

    const answer: ExamAnswer = {
      questionId,
      ...(question.questionType === 'MCQ' ? { optionId: Number(value) } : { answer: String(value) }),
    }
    setAnswers({ ...answers, [questionId]: answer })
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleNext = () => {
    if (examQuery.data && currentQuestionIndex < examQuery.data.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = () => {
    if (!attemptIdRef.current || hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    submitMutation.mutate(attemptIdRef.current)
    setSubmitModalOpen(false)
  }

  const handleAutoSubmit = () => {
    if (!attemptIdRef.current || hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    submitMutation.mutate(attemptIdRef.current)
    message.info('Hết giờ! Bài thi của bạn đã được tự động nộp.')
  }

  if (examQuery.isLoading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Text>Đang tải đề thi...</Typography.Text>
        </Content>
      </Layout>
    )
  }

  if (!examQuery.data) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Text type="danger">Không tìm thấy đề thi</Typography.Text>
        </Content>
      </Layout>
    )
  }

  const currentQuestion = examQuery.data.questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestion.questionId]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Kỳ thi #{examQuery.data.examInstanceId}
        </Typography.Title>
        <Space>
          <Typography.Text strong style={{ fontSize: 18, color: timeRemaining < 300 ? '#ff4d4f' : undefined }}>
            Thời gian còn lại: {formatTime(timeRemaining)}
          </Typography.Text>
        </Space>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff', padding: 16 }}>
          <Typography.Text strong>Danh sách câu hỏi</Typography.Text>
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {examQuery.data.questions.map((q, index) => {
              const hasAnswer = Boolean(answers[q.questionId])
              const isCurrent = index === currentQuestionIndex
              return (
                <Button
                  key={q.questionId}
                  type={isCurrent ? 'primary' : hasAnswer ? 'default' : 'dashed'}
                  shape="circle"
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: isCurrent ? undefined : hasAnswer ? '#52c41a' : undefined,
                    borderColor: isCurrent ? undefined : hasAnswer ? '#52c41a' : undefined,
                    color: isCurrent ? undefined : hasAnswer ? '#fff' : undefined,
                  }}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  {index + 1}
                </Button>
              )
            })}
          </div>
        </Sider>
        <Content style={{ padding: 24, background: '#f0f2f5' }}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Typography.Text type="secondary">Câu {currentQuestionIndex + 1} / {examQuery.data.questions.length}</Typography.Text>
                <Typography.Title level={4} style={{ marginTop: 8 }}>
                  {currentQuestion.content}
                </Typography.Title>
              </div>

              {currentQuestion.questionType === 'MCQ' ? (
                <Radio.Group
                  value={currentAnswer?.optionId}
                  onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {currentQuestion.options?.map((option) => (
                      <Radio key={option.optionId} value={option.optionId} style={{ fontSize: 16 }}>
                        {option.content}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              ) : (
                <Input.TextArea
                  rows={4}
                  placeholder="Nhập đáp án của bạn..."
                  value={currentAnswer?.answer || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.questionId, e.target.value)}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                  Câu trước
                </Button>
                <Space>
                  <Button onClick={() => setSubmitModalOpen(true)} type="primary" danger>
                    Nộp bài
                  </Button>
                  <Button onClick={handleNext} disabled={currentQuestionIndex === examQuery.data.questions.length - 1}>
                    Câu tiếp
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        </Content>
      </Layout>

      <Modal
        open={submitModalOpen}
        title="Xác nhận nộp bài"
        onOk={handleSubmit}
        onCancel={() => setSubmitModalOpen(false)}
        okText="Xác nhận nộp bài"
        cancelText="Hủy"
        confirmLoading={submitMutation.isPending}
      >
        <Typography.Paragraph>
          Bạn có chắc chắn muốn nộp bài? Sau khi nộp bài, bạn sẽ không thể chỉnh sửa lại.
        </Typography.Paragraph>
        <Typography.Text type="secondary">
          Số câu đã trả lời: {Object.keys(answers).length} / {examQuery.data.questions.length}
        </Typography.Text>
      </Modal>
    </Layout>
  )
}

export default StudentExamTakingPage
