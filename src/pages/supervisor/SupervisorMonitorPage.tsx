import { Button, Card, Descriptions, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMonitorData, type MonitorStudent } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'

const SupervisorMonitorPage = () => {
  const { examInstanceId } = useParams<{ examInstanceId: string }>()
  const monitorQuery = useQuery({
    queryKey: ['supervisor-monitor', examInstanceId],
    queryFn: () => getMonitorData(Number(examInstanceId)),
    enabled: Boolean(examInstanceId),
    refetchInterval: 5000, // Auto refresh every 5 seconds
  })

  const formatTimeSpent = (seconds?: number) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  const columns: ColumnsType<MonitorStudent> = [
    { title: 'Họ tên', dataIndex: 'studentName', width: 180 },
    { title: 'Email', dataIndex: 'email', width: 200 },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 150,
      render: (status: MonitorStudent['status']) => {
        const colorMap = {
          NOT_STARTED: 'default',
          DOING: 'processing',
          SUBMITTED: 'success',
        } as const
        const labelMap = {
          NOT_STARTED: 'Chưa bắt đầu',
          DOING: 'Đang làm bài',
          SUBMITTED: 'Đã nộp bài',
        } as const
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>
      },
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startedAt',
      width: 180,
      render: (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '-'),
    },
    {
      title: 'Thời gian nộp bài',
      dataIndex: 'submittedAt',
      width: 180,
      render: (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY HH:mm:ss') : '-'),
    },
    {
      title: 'Thời gian làm bài',
      dataIndex: 'timeSpent',
      width: 150,
      render: (value?: number) => formatTimeSpent(value),
    },
  ]

  if (monitorQuery.isLoading && !monitorQuery.data) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text>Đang tải dữ liệu giám sát...</Typography.Text>
      </Space>
    )
  }

  if (monitorQuery.error) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text type="danger">
          {monitorQuery.error instanceof Error 
            ? monitorQuery.error.message 
            : 'Đã xảy ra lỗi khi tải dữ liệu giám sát'}
        </Typography.Text>
      </Space>
    )
  }

  if (!monitorQuery.data) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Text type="danger">Không tìm thấy dữ liệu giám sát</Typography.Text>
      </Space>
    )
  }

  const data = monitorQuery.data

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3}>Giám sát ca thi</Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => monitorQuery.refetch()}
          loading={monitorQuery.isFetching}
        >
          Làm mới
        </Button>
      </div>

      <Card title="Thông tin ca thi">
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Tên kỳ thi">{data.examName}</Descriptions.Item>
          <Descriptions.Item label="Môn học">{data.subjectName}</Descriptions.Item>
          <Descriptions.Item label="Nhóm sinh viên">{data.studentGroupName}</Descriptions.Item>
          <Descriptions.Item label="Phòng thi">{data.roomNumber || 'Chưa xác định'}</Descriptions.Item>
          <Descriptions.Item label="Thời gian bắt đầu">
            {dayjs(data.startTime).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian kết thúc">
            {dayjs(data.endTime).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title={`Danh sách sinh viên (${data.students.length})`}
        extra={
          <Typography.Text type="secondary">
            Tự động cập nhật mỗi 5 giây • Lần cập nhật cuối: {dayjs().format('HH:mm:ss')}
          </Typography.Text>
        }
      >
        <Table
          rowKey="studentId"
          columns={columns}
          dataSource={data.students}
          loading={monitorQuery.isFetching}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </Space>
  )
}

export default SupervisorMonitorPage

