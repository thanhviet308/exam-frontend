import { Button, Card, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getMyHistory, getAllMyExams } from '../../api/examApi'
import type { ExamAttemptResponse, ExamInstanceResponse } from '../../types/models'
import dayjs from 'dayjs'

interface HistoryItem {
  attemptId: number
  examInstanceId: number
  examName: string
  subjectName?: string
  score?: number
  status: ExamAttemptResponse['status']
  submittedAt?: string
  startTime: string
  endTime: string
}

const StudentHistoryPage = () => {
  const navigate = useNavigate()

  const historyQuery = useQuery<ExamAttemptResponse[]>({
    queryKey: ['student-exam-history'],
    queryFn: getMyHistory,
  })

  // Use getAllMyExams to get all exams (including ended ones) for history page
  const examsQuery = useQuery<ExamInstanceResponse[]>({
    queryKey: ['student-exams-all'],
    queryFn: getAllMyExams,
  })

  // Combine history with exam details
  const historyData: HistoryItem[] =
    historyQuery.data && examsQuery.data
      ? historyQuery.data
          .filter((attempt) => attempt.status === 'SUBMITTED' || attempt.status === 'GRADED')
          .map((attempt) => {
            const exam = examsQuery.data.find((e) => e.id === attempt.examInstanceId)
            return {
              attemptId: attempt.attemptId,
              examInstanceId: attempt.examInstanceId,
              examName: exam?.name || `Kỳ thi #${attempt.examInstanceId}`,
              subjectName: exam?.subjectName,
              score: attempt.score,
              status: attempt.status,
              submittedAt: attempt.submittedAt,
              startTime: exam?.startTime || '',
              endTime: exam?.endTime || '',
            }
          })
          .sort((a, b) => {
            // Sort by submittedAt descending (most recent first)
            if (a.submittedAt && b.submittedAt) {
              return dayjs(b.submittedAt).valueOf() - dayjs(a.submittedAt).valueOf()
            }
            return 0
          })
      : []

  const columns: ColumnsType<HistoryItem> = [
    { title: 'Tên kỳ thi', dataIndex: 'examName', width: 250 },
    {
      title: 'Môn học',
      dataIndex: 'subjectName',
      width: 150,
      render: (subjectName: string | undefined) => subjectName || '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (status: HistoryItem['status']) => {
        const colorMap = {
          SUBMITTED: 'orange',
          GRADED: 'green',
        } as const
        const labelMap = {
          SUBMITTED: 'Đã nộp',
          GRADED: 'Đã chấm',
        } as const
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>
      },
    },
    {
      title: 'Thời gian nộp',
      dataIndex: 'submittedAt',
      width: 180,
      render: (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '-'),
    },
    {
      title: 'Thao tác',
      width: 150,
      render: (_: unknown, record) => (
        <Button type="primary" onClick={() => navigate(`/student/exams/${record.examInstanceId}/result`)}>
          Xem kết quả
        </Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Lịch sử thi</Typography.Title>
      <Card>
        {historyData.length === 0 ? (
          <Empty
            description="Bạn chưa hoàn thành kỳ thi nào. Danh sách các kỳ thi đã hoàn thành và điểm số sẽ được hiển thị tại đây."
          />
        ) : (
          <Table
            rowKey="attemptId"
            columns={columns}
            dataSource={historyData}
            loading={historyQuery.isLoading || examsQuery.isLoading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </Space>
  )
}

export default StudentHistoryPage

