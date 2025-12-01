import { Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ReloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getSupervisorSessions, getSupervisorStatistics, type SupervisorSession } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'

const SupervisorExamSessionsPage = () => {
  const navigate = useNavigate()
  const sessionsQuery = useQuery({
    queryKey: ['supervisor-sessions'],
    queryFn: getSupervisorSessions,
    retry: 1,
    onError: (error) => {
      console.error('[SupervisorSessions] Error fetching sessions:', error)
    },
  })

  const statisticsQuery = useQuery({
    queryKey: ['supervisor-statistics'],
    queryFn: getSupervisorStatistics,
  })

  const columns: ColumnsType<SupervisorSession> = [
    { title: 'Tên kỳ thi', dataIndex: 'examName', width: 200 },
    { title: 'Môn học', dataIndex: 'subjectName', width: 150 },
    { title: 'Nhóm sinh viên', dataIndex: 'studentGroupName', width: 150 },
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

  const statistics = statisticsQuery.data

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>Danh sách ca thi được phân công</Typography.Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            sessionsQuery.refetch()
            statisticsQuery.refetch()
          }}
          loading={sessionsQuery.isFetching || statisticsQuery.isFetching}
        >
          Làm mới
        </Button>
      </div>

      {/* Statistics Section */}
      {statistics && (
        <Card title="Thống kê giám sát">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic title="Tổng số ca thi" value={statistics.totalSessions} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Ca chưa bắt đầu"
                value={statistics.scheduledSessions}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Ca đang diễn ra"
                value={statistics.ongoingSessions}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="Ca đã kết thúc"
                value={statistics.completedSessions}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} lg={8}>
              <Statistic title="Tổng số sinh viên" value={statistics.totalStudents} />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Số bài thi đã hoàn thành"
                value={statistics.completedAttempts}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Statistic
                title="Tổng số vi phạm"
                value={statistics.totalViolations}
                valueStyle={{ color: statistics.totalViolations > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
          </Row>
          {Object.keys(statistics.violationsByType).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Typography.Text strong>Vi phạm theo loại:</Typography.Text>
              <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                {Object.entries(statistics.violationsByType).map(([type, count]) => {
                  const labels: Record<string, string> = {
                    TAB_SWITCH: 'Chuyển tab',
                    WINDOW_BLUR: 'Rời cửa sổ',
                    COPY: 'Sao chép',
                    PASTE: 'Dán nội dung',
                    RIGHT_CLICK: 'Click phải',
                  }
                  return (
                    <Col xs={24} sm={12} lg={6} key={type}>
                      <Card size="small">
                        <Statistic
                          title={labels[type] || type}
                          value={count}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </div>
          )}
        </Card>
      )}

      {/* Student Violations Detail Table */}
      {statistics && statistics.studentViolations && statistics.studentViolations.length > 0 && (
        <Card title="Chi tiết vi phạm theo học sinh">
          <Table
            rowKey={(record) => `${record.studentId}-${record.examInstanceId}`}
            columns={[
              {
                title: 'Học sinh',
                dataIndex: 'studentName',
                key: 'studentName',
                width: 150,
              },
              {
                title: 'Kỳ thi',
                dataIndex: 'examName',
                key: 'examName',
                width: 200,
              },
              {
                title: 'Môn học',
                dataIndex: 'subjectName',
                key: 'subjectName',
                width: 150,
              },
              {
                title: 'Nhóm',
                dataIndex: 'studentGroupName',
                key: 'studentGroupName',
                width: 120,
              },
              {
                title: 'Tổng vi phạm',
                dataIndex: 'totalViolations',
                key: 'totalViolations',
                width: 120,
                render: (count: number) => (
                  <span style={{ color: count > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 'bold' }}>
                    {count}
                  </span>
                ),
                sorter: (a, b) => a.totalViolations - b.totalViolations,
                defaultSortOrder: 'descend',
              },
              {
                title: 'Chi tiết vi phạm',
                key: 'violationsByType',
                width: 300,
                render: (_: unknown, record: any) => {
                  const violations = record.violationsByType || {}
                  const labels: Record<string, string> = {
                    TAB_SWITCH: 'Chuyển tab',
                    WINDOW_BLUR: 'Rời cửa sổ',
                    COPY: 'Sao chép',
                    PASTE: 'Dán nội dung',
                    RIGHT_CLICK: 'Click phải',
                  }
                  return (
                    <Space wrap>
                      {Object.entries(violations).map(([type, count]) => (
                        <Tag key={type} color="red">
                          {labels[type] || type}: {count}
                        </Tag>
                      ))}
                    </Space>
                  )
                },
              },
              {
                title: 'Lần vi phạm cuối',
                dataIndex: 'lastViolationTime',
                key: 'lastViolationTime',
                width: 180,
                render: (time: string) => dayjs(time).format('DD/MM/YYYY HH:mm:ss'),
              },
            ]}
            dataSource={statistics.studentViolations}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      <Card>
        {sessionsQuery.data && sessionsQuery.data.length === 0 && !sessionsQuery.isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Typography.Paragraph type="secondary">
              Bạn chưa được phân công ca thi nào. Vui lòng liên hệ giáo viên để được phân công.
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
              (Giáo viên có thể gán giám thị tại trang "Kỳ thi" → Click nút "Gán giám thị" ở cột "Thao tác")
            </Typography.Paragraph>
          </div>
        )}
        {sessionsQuery.error && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Typography.Paragraph type="danger">
              Có lỗi xảy ra khi tải danh sách ca thi. Vui lòng thử lại.
            </Typography.Paragraph>
            <Button onClick={() => sessionsQuery.refetch()} style={{ marginTop: 16 }}>
              Thử lại
            </Button>
          </div>
        )}
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

