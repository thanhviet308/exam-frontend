import { Button, Card, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getStudentExams, type StudentExam } from '../../api/student/examsApi'
import { getMyHistory } from '../../api/examApi'
import type { ExamAttemptResponse } from '../../types/models'
import dayjs from 'dayjs'

const StudentExamListPage = () => {
  const navigate = useNavigate()
  const examsQuery = useQuery({
    queryKey: ['student-exams'],
    queryFn: getStudentExams,
  })

  const historyQuery = useQuery<ExamAttemptResponse[]>({
    queryKey: ['student-exam-history'],
    queryFn: getMyHistory,
  })

  const columns: ColumnsType<StudentExam> = [
    { title: 'Tên kỳ thi', dataIndex: 'name', width: 250 },
    {
      title: 'Môn học',
      dataIndex: 'subjectName',
      width: 150,
      render: (subjectName: string | undefined) => subjectName || '-',
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startTime',
      width: 180,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thời gian kết thúc',
      dataIndex: 'endTime',
      width: 180,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'durationMinutes',
      width: 120,
      render: (value: number) => `${value} phút`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status: StudentExam['status'], record) => {
        // Check if student has submitted this exam
        const attempt = historyQuery.data?.find((a) => a.examInstanceId === record.id)
        const isSubmitted = attempt?.status === 'SUBMITTED' || attempt?.status === 'GRADED'
        
        if (isSubmitted) {
          return <Tag color="success">Đã hoàn thành</Tag>
        }
        
        const colorMap = {
          NOT_STARTED: 'default',
          ONGOING: 'processing',
          ENDED: 'error',
        } as const
        const labelMap = {
          NOT_STARTED: 'Chưa bắt đầu',
          ONGOING: 'Đang diễn ra',
          ENDED: 'Đã kết thúc',
        } as const
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>
      },
    },
    {
      title: 'Thao tác',
      width: 150,
      render: (_: unknown, record) => {
        // Check if student has submitted this exam
        const attempt = historyQuery.data?.find((a) => a.examInstanceId === record.id)
        const isSubmitted = attempt?.status === 'SUBMITTED' || attempt?.status === 'GRADED'
        const canStart = (record.status === 'ONGOING' || record.status === 'NOT_STARTED') && !isSubmitted
        
        return (
          <Space>
            {isSubmitted ? (
              <Tag color="success">Đã hoàn thành</Tag>
            ) : canStart ? (
              <Button type="primary" onClick={() => navigate(`/student/exams/${record.id}/do`)}>
                Vào thi
              </Button>
            ) : (
              <Button disabled>Đã kết thúc</Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Danh sách kỳ thi</Typography.Title>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={examsQuery.data}
          loading={examsQuery.isLoading || historyQuery.isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Space>
  )
}

export default StudentExamListPage
