import { Card, Empty, Select, Space, Table, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchExamInstances } from '../../api/teacher/examInstanceApi'
import { fetchExamResults } from '../../api/teacher/resultsApi'
import type { TeacherExamInstance, TeacherExamResult } from '../../types'

const TeacherResultsPage = () => {
  const [selectedExam, setSelectedExam] = useState<number | undefined>(undefined)
  const instanceQuery = useQuery<TeacherExamInstance[]>({
    queryKey: ['teacher-exams'],
    queryFn: fetchExamInstances,
  })

  const resultQuery = useQuery<TeacherExamResult[]>({
    queryKey: ['teacher-results', selectedExam],
    queryFn: () => fetchExamResults(selectedExam!),
    enabled: Boolean(selectedExam),
  })

  const columns = [
    { title: 'Sinh viên', dataIndex: 'studentName' },
    {
      title: 'Email',
      dataIndex: 'studentEmail',
      render: (email: string) => email || '-',
    },
    { title: 'Điểm', dataIndex: 'score', width: 100 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status: TeacherExamResult['status']) => {
        const colorMap = {
          NOT_STARTED: 'default',
          IN_PROGRESS: 'blue',
          SUBMITTED: 'orange',
          GRADED: 'green',
        } as const
        const labelMap: Record<TeacherExamResult['status'], string> = {
          NOT_STARTED: 'Chưa làm',
          IN_PROGRESS: 'Đang làm',
          SUBMITTED: 'Đã nộp',
          GRADED: 'Đã chấm',
        }
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>
      },
    },
    {
      title: 'Thời gian nộp',
      dataIndex: 'submittedAt',
      render: (value?: string) => (value ? new Date(value).toLocaleString() : '-'),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Kết quả kỳ thi
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Theo dõi điểm số và trạng thái làm bài của từng sinh viên cho mỗi kỳ thi.
      </Typography.Paragraph>
      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>Chọn kỳ thi</Typography.Text>
          <Select
            placeholder="Chọn kỳ thi"
            options={instanceQuery.data?.map((exam) => ({ label: exam.name, value: exam.id }))}
            style={{ width: 360 }}
            value={selectedExam}
            onChange={(value) => setSelectedExam(value)}
            allowClear
          />
        </Space>
      </Card>

      {selectedExam ? (
        <Card title="Danh sách sinh viên" style={{ borderRadius: 16 }}>
          <Table
            rowKey="attemptId"
            loading={resultQuery.isLoading}
            columns={columns}
            dataSource={resultQuery.data}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ) : (
        <Card style={{ borderRadius: 16 }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chọn một kỳ thi để xem danh sách kết quả."
          />
        </Card>
      )}
    </Space>
  )
}

export default TeacherResultsPage

