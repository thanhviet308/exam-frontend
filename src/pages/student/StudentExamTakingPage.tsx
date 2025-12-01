import { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Card, Input, Layout, Modal, Radio, Space, Typography, message } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { startAttempt, submitAttempt, answerQuestion, getAttemptDetail } from '../../api/examApi'
import apiClient from '../../api/axiosClient'
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
  const queryClient = useQueryClient()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({})
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [violationCount, setViolationCount] = useState(0)
  const hasSubmittedRef = useRef(false)
  const attemptIdRef = useRef<number | null>(null)
  const saveAnswerTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})

  // Query must be defined BEFORE useEffects that use it
  const examQuery = useQuery<StartAttemptResponse>({
    queryKey: ['student-exam-start', examId],
    queryFn: async () => {
      try {
        console.log('Starting exam attempt for examId:', examId)
        const result = await startAttempt(Number(examId))
        console.log('Exam attempt started successfully:', result)
        return result
      } catch (error) {
        console.error('Error starting exam attempt:', error)
        throw error
      }
    },
    enabled: Boolean(examId),
    staleTime: Infinity, // Don't refetch during exam
    retry: false, // Don't retry on error to show error message immediately
  })

  // Report violation to backend
  const reportViolation = useCallback(async (violationType: string) => {
    if (!attemptIdRef.current || hasSubmittedRef.current) return
    try {
      await apiClient.post(`/exam-attempts/${attemptIdRef.current}/violations`, { violationType })
      setViolationCount(prev => prev + 1)
    } catch (error) {
      console.error('Failed to report violation:', error)
    }
  }, [])

  // Track tab/window switching - set up listeners when attemptId is available
  useEffect(() => {
    const attemptId = examQuery.data?.attemptId
    if (!attemptId || hasSubmittedRef.current) return

    console.log('Setting up violation tracking for attemptId:', attemptId)

    const handleVisibilityChange = () => {
      if (document.hidden && !hasSubmittedRef.current) {
        reportViolation('TAB_SWITCH')
        message.warning({
          content: '⚠️ Cảnh báo: Bạn đã rời khỏi trang thi! Hành vi này đã được ghi nhận.',
          duration: 5,
          icon: <WarningOutlined style={{ color: '#faad14' }} />,
        })
      }
    }

    const handleWindowBlur = () => {
      if (!document.hidden && !hasSubmittedRef.current) {
        reportViolation('WINDOW_BLUR')
      }
    }

    const handleCopy = (e: ClipboardEvent) => {
      if (hasSubmittedRef.current) return
      e.preventDefault()
      reportViolation('COPY')
      message.warning({
        content: '⚠️ Cảnh báo: Không được sao chép nội dung! Hành vi này đã được ghi nhận.',
        duration: 3,
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
      })
    }

    const handlePaste = (e: ClipboardEvent) => {
      if (hasSubmittedRef.current) return
      e.preventDefault()
      reportViolation('PASTE')
      message.warning({
        content: '⚠️ Cảnh báo: Không được dán nội dung! Hành vi này đã được ghi nhận.',
        duration: 3,
        icon: <WarningOutlined style={{ color: '#faad14' }} />,
      })
    }

    const handleContextMenu = (e: MouseEvent) => {
      if (hasSubmittedRef.current) return
      e.preventDefault()
      reportViolation('RIGHT_CLICK')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [examQuery.data?.attemptId, reportViolation])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveAnswerTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  // Store attemptId when exam starts and load saved answers
  useEffect(() => {
    if (examQuery.data?.attemptId) {
      attemptIdRef.current = examQuery.data.attemptId
      
      // Load saved answers if attempt is in progress
      if (examQuery.data.status === 'IN_PROGRESS') {
        getAttemptDetail(examQuery.data.attemptId)
          .then((detail) => {
            // Map saved answers to local state
            const savedAnswers: Record<number, ExamAnswer> = {}
            detail.questionResults.forEach((result) => {
              const question = examQuery.data?.questions.find((q) => q.questionId === result.questionId)
              if (question && result.studentAnswer !== undefined) {
                savedAnswers[result.questionId] = {
                  questionId: result.questionId,
                  ...(question.questionType === 'MCQ' 
                    ? { optionId: typeof result.studentAnswer === 'number' ? result.studentAnswer : undefined }
                    : { answer: String(result.studentAnswer) }
                  ),
                }
              }
            })
            setAnswers(savedAnswers)
          })
          .catch((error) => {
            console.error('Error loading saved answers:', error)
            // Continue without saved answers if there's an error
          })
      }
    }
    // If attempt is already submitted, redirect to result page
    if (examQuery.data?.status === 'SUBMITTED' || examQuery.data?.status === 'GRADED') {
      message.info('Bạn đã nộp bài thi này. Đang chuyển đến trang kết quả...')
      navigate(`/student/exams/${examId}/result`)
    }
  }, [examQuery.data, examId, navigate])

  const submitMutation = useMutation({
    mutationFn: (attemptId: number) => submitAttempt(attemptId),
    onSuccess: () => {
      message.success('Đã nộp bài thành công')
      // Invalidate queries to update exam list and history
      queryClient.invalidateQueries({ queryKey: ['student-exams'] })
      queryClient.invalidateQueries({ queryKey: ['student-exam-history'] })
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

  // Auto-save answer to backend
  const saveAnswerMutation = useMutation({
    mutationFn: async ({ attemptId, questionId, questionType, value }: { 
      attemptId: number
      questionId: number
      questionType: string
      value: string | number 
    }) => {
      const request = questionType === 'MCQ' 
        ? { questionId, selectedOptionId: Number(value), fillAnswer: null }
        : { questionId, selectedOptionId: null, fillAnswer: String(value) }
      return answerQuestion(attemptId, request)
    },
    onError: (error: any) => {
      console.error('Failed to save answer:', error)
      // Don't show error message to avoid interrupting user
    },
  })

  const handleAnswerChange = (questionId: number, value: string | number) => {
    if (hasSubmittedRef.current || examQuery.data?.status === 'SUBMITTED' || examQuery.data?.status === 'GRADED') {
      return // Prevent changes if already submitted
    }
    const question = examQuery.data?.questions.find((q) => q.questionId === questionId)
    if (!question || !attemptIdRef.current) return

    const answer: ExamAnswer = {
      questionId,
      ...(question.questionType === 'MCQ' ? { optionId: Number(value) } : { answer: String(value) }),
    }
    setAnswers({ ...answers, [questionId]: answer })

    // Clear existing timeout for this question
    if (saveAnswerTimeoutRef.current[questionId]) {
      clearTimeout(saveAnswerTimeoutRef.current[questionId])
    }

    // Auto-save after 500ms debounce (to avoid too many API calls)
    saveAnswerTimeoutRef.current[questionId] = setTimeout(() => {
      if (!hasSubmittedRef.current && attemptIdRef.current) {
        saveAnswerMutation.mutate({
          attemptId: attemptIdRef.current,
          questionId,
          questionType: question.questionType,
          value,
        })
      }
    }, 500)
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

  const handleSubmit = async () => {
    if (!attemptIdRef.current || hasSubmittedRef.current) return
    
    // Clear all pending timeouts
    Object.values(saveAnswerTimeoutRef.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    saveAnswerTimeoutRef.current = {}

    // Save all pending answers before submitting
    const pendingSaves = Object.entries(answers)
      .filter(([questionId, answer]) => {
        const question = examQuery.data?.questions.find((q) => q.questionId === Number(questionId))
        return question && attemptIdRef.current
      })
      .map(([questionId, answer]) => {
        const question = examQuery.data?.questions.find((q) => q.questionId === Number(questionId))!
        const request = question.questionType === 'MCQ'
          ? { questionId: Number(questionId), selectedOptionId: answer.optionId!, fillAnswer: null }
          : { questionId: Number(questionId), selectedOptionId: null, fillAnswer: answer.answer || '' }
        return answerQuestion(attemptIdRef.current!, request)
      })

    try {
      // Wait for all answers to be saved
      await Promise.all(pendingSaves)
    } catch (error) {
      console.error('Error saving answers before submit:', error)
      // Continue with submit even if some saves fail
    }

    hasSubmittedRef.current = true
    submitMutation.mutate(attemptIdRef.current)
    setSubmitModalOpen(false)
  }

  const handleAutoSubmit = async () => {
    if (!attemptIdRef.current || hasSubmittedRef.current) return
    
    // Clear all pending timeouts
    Object.values(saveAnswerTimeoutRef.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    saveAnswerTimeoutRef.current = {}

    // Save all pending answers before auto-submitting
    const pendingSaves = Object.entries(answers)
      .filter(([questionId, answer]) => {
        const question = examQuery.data?.questions.find((q) => q.questionId === Number(questionId))
        return question && attemptIdRef.current
      })
      .map(([questionId, answer]) => {
        const question = examQuery.data?.questions.find((q) => q.questionId === Number(questionId))!
        const request = question.questionType === 'MCQ'
          ? { questionId: Number(questionId), selectedOptionId: answer.optionId!, fillAnswer: null }
          : { questionId: Number(questionId), selectedOptionId: null, fillAnswer: answer.answer || '' }
        return answerQuestion(attemptIdRef.current!, request)
      })

    try {
      // Wait for all answers to be saved (with timeout to avoid blocking too long)
      await Promise.race([
        Promise.all(pendingSaves),
        new Promise(resolve => setTimeout(resolve, 2000)) // Max 2 seconds wait
      ])
    } catch (error) {
      console.error('Error saving answers before auto-submit:', error)
      // Continue with submit even if some saves fail
    }

    hasSubmittedRef.current = true
    submitMutation.mutate(attemptIdRef.current)
    message.info('Hết giờ! Bài thi của bạn đã được tự động nộp.')
  }

  // Handle error - if attempt already submitted, redirect to result
  useEffect(() => {
    if (examQuery.error) {
      const errorMessage = (examQuery.error as any)?.response?.data?.message || (examQuery.error as Error)?.message || ''
      if (errorMessage.includes('đã hoàn thành') || errorMessage.includes('đã được nộp') || errorMessage.includes('SUBMITTED')) {
        message.warning('Bạn đã nộp bài thi này. Đang chuyển đến trang kết quả...')
        navigate(`/student/exams/${examId}/result`)
      }
    }
  }, [examQuery.error, examId, navigate])

  if (examQuery.isLoading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Text>Đang tải đề thi...</Typography.Text>
        </Content>
      </Layout>
    )
  }

  if (examQuery.error) {
    const error = examQuery.error as any
    const errorMessage = error?.response?.data?.message || error?.message || 'Có lỗi xảy ra khi tải đề thi'
    console.error('Exam loading error:', error)
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Title level={4} type="danger">Lỗi</Typography.Title>
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
            {errorMessage}
          </Typography.Text>
          {error?.response?.status === 403 && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Bạn không có quyền truy cập kỳ thi này hoặc kỳ thi đã kết thúc.
            </Typography.Text>
          )}
          {error?.response?.status === 404 && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              Không tìm thấy kỳ thi này.
            </Typography.Text>
          )}
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/student/exams')}>
              Quay lại danh sách
            </Button>
          </div>
        </Content>
      </Layout>
    )
  }

  if (!examQuery.data) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Title level={4} type="danger">Không tìm thấy đề thi</Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Đề thi không tồn tại hoặc đã bị xóa.
          </Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/student/exams')}>
              Quay lại danh sách
            </Button>
          </div>
        </Content>
      </Layout>
    )
  }

  // Check if already submitted
  const isSubmitted = hasSubmittedRef.current || examQuery.data.status === 'SUBMITTED' || examQuery.data.status === 'GRADED'
  
  if (isSubmitted) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Text type="success" style={{ fontSize: 16 }}>
            Bạn đã nộp bài thi này.
          </Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate(`/student/exams/${examId}/result`)}>
              Xem kết quả
            </Button>
          </div>
        </Content>
      </Layout>
    )
  }

  // Safety check: ensure questions array exists and is not empty
  if (!examQuery.data.questions || examQuery.data.questions.length === 0) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Title level={4} type="danger">Lỗi</Typography.Title>
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
            Đề thi không có câu hỏi nào.
          </Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/student/exams')}>
              Quay lại danh sách
            </Button>
          </div>
        </Content>
      </Layout>
    )
  }

  const currentQuestion = examQuery.data.questions[currentQuestionIndex]
  if (!currentQuestion) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: 24, textAlign: 'center' }}>
          <Typography.Title level={4} type="danger">Lỗi</Typography.Title>
          <Typography.Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
            Không tìm thấy câu hỏi hiện tại.
          </Typography.Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/student/exams')}>
              Quay lại danh sách
            </Button>
          </div>
        </Content>
      </Layout>
    )
  }
  
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
                  onClick={() => !isSubmitted && setCurrentQuestionIndex(index)}
                  disabled={isSubmitted}
                >
                  {index + 1}
                </Button>
              )
            })}
          </div>
        </Sider>
        <Content style={{ padding: 24, background: '#f0f2f5' }}>
          {/* Display passage if question has one */}
          {currentQuestion.passageContent && (
            <Card 
              style={{ marginBottom: 16, backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}
              title={
                <Typography.Text strong style={{ color: '#d48806' }}>
                  📖 Đọc đoạn văn sau:
                </Typography.Text>
              }
            >
              <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {currentQuestion.passageContent}
              </Typography.Paragraph>
            </Card>
          )}
          
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
                  disabled={isSubmitted}
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
                  disabled={isSubmitted}
                />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0 || isSubmitted}>
                  Câu trước
                </Button>
                <Space>
                  <Button 
                    onClick={() => setSubmitModalOpen(true)} 
                    type="primary" 
                    danger
                    disabled={isSubmitted}
                  >
                    Nộp bài
                  </Button>
                  <Button 
                    onClick={handleNext} 
                    disabled={currentQuestionIndex === examQuery.data.questions.length - 1 || isSubmitted}
                  >
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
