import { Button, Card, List, Space, Statistic, Tag, Typography, Alert } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getExamResult } from '../../api/student/examsApi'
import { getAllMyExams } from '../../api/examApi'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const StudentExamResultPage = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  // Fetch ALL exam instances (including ended ones) to check endTime
  const examsQuery = useQuery({
    queryKey: ['student-exams-all'],
    queryFn: getAllMyExams,
  })

  // Check if exam has ended
  const examInstance = examsQuery.data?.find((exam) => exam.id === Number(examId))
  const hasExamEnded = examInstance ? dayjs().isAfter(dayjs(examInstance.endTime)) : true // Default to true if exam not found (assume ended)

  // Fetch result - allow fetching even if exam hasn't ended (to show score)
  const resultQuery = useQuery({
    queryKey: ['student-exam-result', examId],
    queryFn: () => getExamResult(Number(examId)),
    enabled: Boolean(examId) && Boolean(examsQuery.data),
  })


  // If exam hasn't ended, show message only (check this before loading)
  if (examsQuery.data && !hasExamEnded && examInstance) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>Kết quả bài thi</Typography.Title>
        <Card>
          <Alert
            message="Kết quả sẽ được công bố khi kỳ thi kết thúc"
            description={
              <div>
                <Typography.Paragraph>
                  Kết quả bài thi (điểm số và chi tiết từng câu hỏi) sẽ được công bố sau khi thời gian thi kết thúc.
                </Typography.Paragraph>
                <Typography.Text type="secondary">
                  Thời gian kết thúc: {dayjs(examInstance.endTime).format('DD/MM/YYYY HH:mm:ss')}
                </Typography.Text>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </Card>
        <div style={{ textAlign: 'center' }}>
          <Button type="primary" onClick={() => navigate('/student/exams')}>
            Quay lại danh sách
          </Button>
        </div>
      </Space>
    )
  }

  if (examsQuery.isLoading) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>Đang tải thông tin...</Typography.Text>
      </Space>
    )
  }

  if (resultQuery.isLoading) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>Đang tải kết quả...</Typography.Text>
      </Space>
    )
  }

  // Handle error case (only if exam has ended)
  if (resultQuery.isError) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>Kết quả bài thi</Typography.Title>
        <Card>
          <Alert
            message="Không thể tải kết quả"
            description={
              <div>
                <Typography.Paragraph>
                  {(resultQuery.error as Error)?.message || 'Có lỗi xảy ra khi tải kết quả bài thi.'}
                </Typography.Paragraph>
                <Typography.Paragraph>
                  Có thể bạn chưa nộp bài thi này.
                </Typography.Paragraph>
              </div>
            }
            type="error"
            showIcon
            action={
              <Button size="small" onClick={() => navigate('/student/exams')}>
                Quay lại danh sách
              </Button>
            }
          />
        </Card>
      </Space>
    )
  }

  if (!resultQuery.data) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={3}>Kết quả bài thi</Typography.Title>
        <Card>
          <Alert
            message="Không tìm thấy kết quả"
            description="Bạn chưa nộp bài thi này hoặc kết quả chưa có sẵn."
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={() => navigate('/student/exams')}>
                Quay lại danh sách
              </Button>
            }
          />
        </Card>
      </Space>
    )
  }

  const result = resultQuery.data
  
  // Calculate percentage safely
  const totalMarks = result.totalMarks || 0
  const score = result.score || 0
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Kết quả bài thi</Typography.Title>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="Điểm số"
              value={score}
              suffix={`/ ${totalMarks}`}
              valueStyle={{ color: percentage >= 50 ? '#3f8600' : '#cf1322', fontSize: 48 }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 18 }}>
              ({percentage}%)
            </Typography.Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 24 }}>
            <Statistic
              title="Số câu đúng"
              value={result.correctAnswers}
              suffix={`/ ${result.totalQuestions}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
            <Statistic
              title="Số câu sai"
              value={result.totalQuestions - result.correctAnswers}
              suffix={`/ ${result.totalQuestions}`}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </div>

          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginTop: 16 }}>
            Thời gian nộp bài: {dayjs(result.submittedAt).format('DD/MM/YYYY HH:mm:ss')}
          </Typography.Paragraph>
        </Space>
      </Card>

      {/* Show detail section based on exam end time */}
      {hasExamEnded ? (
        <Card title="Chi tiết từng câu hỏi">
          {result.questionResults && result.questionResults.length > 0 ? (
            <List
              dataSource={result.questionResults}
              renderItem={(item, index) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Typography.Text strong>Câu {index + 1}:</Typography.Text>
                      <Typography.Text>{item.content}</Typography.Text>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ marginTop: 8 }}>
                      <div>
                        <Typography.Text>Đáp án của bạn: </Typography.Text>
                        <Typography.Text strong>{String(item.studentAnswer || 'Chưa trả lời')}</Typography.Text>
                      </div>
                      <div>
                        <Typography.Text>Đáp án đúng: </Typography.Text>
                        <Typography.Text strong style={{ color: '#52c41a' }}>
                          {String(item.correctAnswer || 'N/A')}
                        </Typography.Text>
                      </div>
                      <div>
                        <Typography.Text>Điểm: </Typography.Text>
                        <Typography.Text strong>
                          {item.earnedMarks} / {item.marks}
                        </Typography.Text>
                      </div>
                    </Space>
                  }
                />
                <Tag color={item.isCorrect ? 'success' : 'error'} style={{ fontSize: 16, padding: '4px 12px' }}>
                  {item.isCorrect ? 'Đúng' : 'Sai'}
                </Tag>
              </List.Item>
            )}
            />
          ) : (
            <Alert
              message="Chưa có dữ liệu câu hỏi"
              description="Không tìm thấy thông tin chi tiết về các câu hỏi trong bài thi này."
              type="info"
              showIcon
            />
          )}
        </Card>
      ) : (
        <Card title="Chi tiết từng câu hỏi">
          <Alert
            message="Kết quả chi tiết chưa được công bố"
            description={
              <div>
                <Typography.Paragraph>
                  Kết quả chi tiết (câu nào đúng, câu nào sai) sẽ được công bố sau khi thời gian thi kết thúc.
                </Typography.Paragraph>
                {examInstance && (
                  <Typography.Text type="secondary">
                    Thời gian kết thúc: {dayjs(examInstance.endTime).format('DD/MM/YYYY HH:mm:ss')}
                  </Typography.Text>
                )}
              </div>
            }
            type="info"
            showIcon
          />
        </Card>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="primary" onClick={() => navigate('/student/exams')}>
          Quay lại danh sách
        </Button>
      </div>
    </Space>
  )
}

export default StudentExamResultPage
