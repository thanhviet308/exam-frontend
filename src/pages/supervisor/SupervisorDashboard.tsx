import { Card, Col, List, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { getSupervisorStatistics, type SupervisorStatistics } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import ViolationDetailSidebar from '../../components/supervisor/ViolationDetailSidebar'

const SupervisorDashboard = () => {
  const navigate = useNavigate()
  const [selectedSession, setSelectedSession] = useState<SupervisorStatistics['recentSessions'][0] | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  
  const statisticsQuery = useQuery({
    queryKey: ['supervisor-statistics'],
    queryFn: getSupervisorStatistics,
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

  const getStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      SCHEDULED: 'default',
      ONGOING: 'processing',
      COMPLETED: 'success',
    }
    const labelMap: Record<string, string> = {
      SCHEDULED: 'Chưa bắt đầu',
      ONGOING: 'Đang diễn ra',
      COMPLETED: 'Đã kết thúc',
    }
    return <Tag color={colorMap[status] || 'default'}>{labelMap[status] || status}</Tag>
  }

  const recentSessionsColumns: ColumnsType<SupervisorStatistics['recentSessions'][0]> = [
    {
      title: 'Tên kỳ thi',
      dataIndex: 'examName',
      key: 'examName',
    },
    {
      title: 'Môn học',
      dataIndex: 'subjectName',
      key: 'subjectName',
    },
    {
      title: 'Nhóm sinh viên',
      dataIndex: 'studentGroupName',
      key: 'studentGroupName',
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => (
        <div>
          <div>Bắt đầu: {dayjs(record.startTime).format('DD/MM/YYYY HH:mm')}</div>
          <div>Kết thúc: {dayjs(record.endTime).format('DD/MM/YYYY HH:mm')}</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Sinh viên',
      key: 'students',
      render: (_, record) => (
        <div>
          <div>Tổng: {record.totalStudents}</div>
          <div>Đã hoàn thành: {record.completedStudents}</div>
        </div>
      ),
    },
    {
      title: 'Vi phạm',
      dataIndex: 'violationsCount',
      key: 'violationsCount',
      render: (count) => <span style={{ color: count > 0 ? '#ff4d4f' : '#52c41a' }}>{count}</span>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <a onClick={() => navigate(`/supervisor/sessions/${record.examInstanceId}/monitor`)}>
            Giám sát
          </a>
          <a
            onClick={() => {
              setSelectedSession(record)
              setSidebarVisible(true)
            }}
          >
            Chi tiết vi phạm
          </a>
        </Space>
      ),
    },
  ]

  if (statisticsQuery.isLoading) {
    return (
      <div>
        <Typography.Title level={3}>Thống kê giám sát</Typography.Title>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Tổng số ca thi" value={0} loading />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Ca đang diễn ra" value={0} loading />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Ca đã kết thúc" value={0} loading />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Tổng sinh viên" value={0} loading />
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  const statistics = statisticsQuery.data

  if (!statistics) {
    return (
      <Card style={{ marginTop: 24 }}>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
          Không thể tải dữ liệu thống kê. Vui lòng thử lại.
        </Typography.Paragraph>
      </Card>
    )
  }

  return (
    <div style={{ marginRight: sidebarVisible ? 400 : 0, transition: 'margin-right 0.3s' }}>
      <Typography.Title level={3}>Thống kê giám sát</Typography.Title>

      {/* Overview Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Tổng số ca thi" value={statistics.totalSessions} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ca chưa bắt đầu"
              value={statistics.scheduledSessions}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ca đang diễn ra"
              value={statistics.ongoingSessions}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Ca đã kết thúc"
              value={statistics.completedSessions}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Student and Attempt Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic title="Tổng số sinh viên" value={statistics.totalStudents} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Số bài thi đã hoàn thành"
              value={statistics.completedAttempts}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Tổng số vi phạm"
              value={statistics.totalViolations}
              valueStyle={{ color: statistics.totalViolations > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Violations by Type */}
      {Object.keys(statistics.violationsByType).length > 0 && (
        <Card title="Vi phạm theo loại" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]}>
            {Object.entries(statistics.violationsByType).map(([type, count]) => (
              <Col xs={24} sm={12} lg={6} key={type}>
                <Card size="small">
                  <Statistic
                    title={getViolationLabel(type)}
                    value={count}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Student Violations Detail Table */}
      {statistics.studentViolations && statistics.studentViolations.length > 0 && (
        <Card title="Chi tiết vi phạm theo học sinh" style={{ marginTop: 24 }}>
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
                  return (
                    <Space wrap>
                      {Object.entries(violations).map(([type, count]) => (
                        <Tag key={type} color="red">
                          {getViolationLabel(type)}: {count}
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

      {/* Recent Sessions Table */}
      {statistics.recentSessions.length > 0 && (
        <Card title="Các ca thi gần đây" style={{ marginTop: 24 }}>
          <Table
            columns={recentSessionsColumns}
            dataSource={statistics.recentSessions}
            rowKey="examInstanceId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      {/* Student Violations Detail Table */}
      {statistics.studentViolations && statistics.studentViolations.length > 0 && (
        <Card title="Chi tiết vi phạm theo học sinh" style={{ marginTop: 24 }}>
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

      {statistics.totalSessions === 0 && (
        <Card style={{ marginTop: 24 }}>
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', margin: 0 }}>
            Bạn chưa được phân công ca thi nào. Vui lòng liên hệ giáo viên để được phân công.
          </Typography.Paragraph>
        </Card>
      )}

      {/* Violation Detail Sidebar */}
      <ViolationDetailSidebar
        visible={sidebarVisible}
        onClose={() => {
          setSidebarVisible(false)
          setSelectedSession(null)
        }}
        selectedSession={selectedSession}
        studentViolations={statistics.studentViolations || []}
      />
    </div>
  )
}

export default SupervisorDashboard
