import { Button, Card, List, Space, Statistic, Tag, Typography } from 'antd'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getExamResult } from '../../api/student/examsApi'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const StudentExamResultPage = () => {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const resultQuery = useQuery({
    queryKey: ['student-exam-result', examId],
    queryFn: () => getExamResult(Number(examId)),
    enabled: Boolean(examId),
  })

  if (resultQuery.isLoading) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>Đang tải kết quả...</Typography.Text>
      </Space>
    )
  }

  if (!resultQuery.data) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text type="danger">Không tìm thấy kết quả</Typography.Text>
      </Space>
    )
  }

  const result = resultQuery.data
  const percentage = result && result.score != null ? Math.round((result.score / result.totalMarks) * 100) : 0

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Kết quả bài thi</Typography.Title>

      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Statistic
              title="Điểm số"
              value={result.score}
              suffix={`/ ${result.totalMarks}`}
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

      <Card title="Chi tiết từng câu hỏi">
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
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button type="primary" onClick={() => navigate('/student/exams')}>
          Quay lại danh sách
        </Button>
      </div>
    </Space>
  )
}

export default StudentExamResultPage
