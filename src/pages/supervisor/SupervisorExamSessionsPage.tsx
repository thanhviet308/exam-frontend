import { Button, Card, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSupervisorSessions, type SupervisorSession } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'

const SupervisorExamSessionsPage = () => {
  const navigate = useNavigate()
  const sessionsQuery = useQuery({
    queryKey: ['supervisor-sessions'],
    queryFn: getSupervisorSessions,
  })

  const columns: ColumnsType<SupervisorSession> = [
    { title: 'Tên kỳ thi', dataIndex: 'examName', width: 200 },
    { title: 'Môn học', dataIndex: 'subjectName', width: 150 },
    { title: 'Nhóm sinh viên', dataIndex: 'studentGroupName', width: 150 },
    {
      title: 'Phòng thi',
      dataIndex: 'roomNumber',
      width: 120,
      render: (value?: string) => value || <Typography.Text type="secondary">-</Typography.Text>,
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
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status: SupervisorSession['status']) => {
        const colorMap = {
          SCHEDULED: 'default',
          ONGOING: 'processing',
          COMPLETED: 'success',
        } as const
        const labelMap = {
          SCHEDULED: 'Chưa bắt đầu',
          ONGOING: 'Đang diễn ra',
          COMPLETED: 'Đã kết thúc',
        } as const
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>
      },
    },
    {
      title: 'Thao tác',
      width: 120,
      render: (_: unknown, record) => (
        <Button
          type="primary"
          onClick={() => navigate(`/supervisor/monitor/${record.id}`)}
          disabled={record.status === 'COMPLETED'}
        >
          Giám sát
        </Button>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Danh sách ca thi được phân công</Typography.Title>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={sessionsQuery.data}
          loading={sessionsQuery.isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </Space>
  )
}

export default SupervisorExamSessionsPage

