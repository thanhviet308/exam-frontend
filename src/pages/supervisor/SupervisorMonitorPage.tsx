import { Button, Card, Descriptions, Space, Table, Tag, Typography, Badge, Alert } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMonitorData, type MonitorStudent } from '../../api/supervisor/supervisorApi'
import apiClient from '../../api/axiosClient'
import dayjs from 'dayjs'

interface Violation {
  id: number
  attemptId: number
  studentId: number
  studentName: string
  violationType: string
  violationCount: number
  lastOccurredAt: string
}

const SupervisorMonitorPage = () => {
  const { examInstanceId } = useParams<{ examInstanceId: string }>()
  
  const monitorQuery = useQuery({
    queryKey: ['supervisor-monitor', examInstanceId],
    queryFn: () => getMonitorData(Number(examInstanceId)),
    enabled: Boolean(examInstanceId),
    refetchInterval: 5000, // Auto refresh every 5 seconds
  })

  const violationsQuery = useQuery({
    queryKey: ['supervisor-violations', examInstanceId],
    queryFn: async () => {
      const response = await apiClient.get<Violation[]>(`/exam-attempts/exam/${examInstanceId}/violations`)
      return response.data
    },
    enabled: Boolean(examInstanceId),
    refetchInterval: 5000, // Auto refresh every 5 seconds
  })

  const getViolationLabel = (type: string) => {
    const labels: Record<string, string> = {
      TAB_SWITCH: 'Chuyển tab',
      WINDOW_BLUR: 'Rời cửa sổ',
      COPY: 'Sao chép',
      PASTE: 'Dán nội dung',
      RIGHT_CLICK: 'Click phải',
    }
    return labels[type] || type
  }

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
    {
      title: 'Vi phạm',
      width: 120,
      render: (_: unknown, record: MonitorStudent) => {
        const studentViolations = violationsQuery.data?.filter(v => v.studentId === record.studentId) || []
        const totalViolations = studentViolations.reduce((sum, v) => sum + v.violationCount, 0)
        
        if (totalViolations === 0) {
          return <Tag color="green">Không có</Tag>
        }
        
        return (
          <Badge count={totalViolations} overflowCount={99}>
            <Tag color="red" icon={<WarningOutlined />}>
              Có vi phạm
            </Tag>
          </Badge>
        )
      },
    },
  ]

  const violationColumns: ColumnsType<Violation> = [
    { title: 'Sinh viên', dataIndex: 'studentName', width: 180 },
    {
      title: 'Loại vi phạm',
      dataIndex: 'violationType',
      width: 150,
      render: (type: string) => (
        <Tag color="red" icon={<WarningOutlined />}>
          {getViolationLabel(type)}
        </Tag>
      ),
    },
    {
      title: 'Số lần',
      dataIndex: 'violationCount',
      width: 100,
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: count > 3 ? '#ff4d4f' : '#faad14' }} />
      ),
    },
    {
      title: 'Lần cuối',
      dataIndex: 'lastOccurredAt',
      width: 180,
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss'),
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
          <Descriptions.Item label="Thời gian bắt đầu">
            {dayjs(data.startTime).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian kết thúc">
            {dayjs(data.endTime).format('DD/MM/YYYY HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Violations Alert */}
      {violationsQuery.data && violationsQuery.data.length > 0 && (
        <Alert
          message={
            <span>
              <WarningOutlined style={{ marginRight: 8 }} />
              <strong>Phát hiện {violationsQuery.data.reduce((sum, v) => sum + v.violationCount, 0)} vi phạm</strong> từ {new Set(violationsQuery.data.map(v => v.studentId)).size} sinh viên
            </span>
          }
          type="warning"
          showIcon={false}
          style={{ marginBottom: 16 }}
        />
      )}

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

      {/* Violations Table */}
      {violationsQuery.data && violationsQuery.data.length > 0 && (
        <Card
          title={
            <span style={{ color: '#ff4d4f' }}>
              <WarningOutlined style={{ marginRight: 8 }} />
              Chi tiết vi phạm ({violationsQuery.data.length} loại)
            </span>
          }
        >
          <Table
            rowKey="id"
            columns={violationColumns}
            dataSource={violationsQuery.data}
            loading={violationsQuery.isFetching}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}
    </Space>
  )
}

export default SupervisorMonitorPage

