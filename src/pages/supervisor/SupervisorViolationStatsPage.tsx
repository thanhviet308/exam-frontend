import { Card, List, Space, Tag, Typography, Collapse, Empty, Button } from 'antd'
import { FileExcelOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { getSupervisorStatistics, type SupervisorStatistics } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'
import { PageSpinner, ErrorState } from '../../components/Loaders'
import { exportViolationsToExcel } from '../../utils/exportViolationsToExcel'

const { Panel } = Collapse

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

const SupervisorViolationStatsPage = () => {
  const statisticsQuery = useQuery({
    queryKey: ['supervisor-statistics'],
    queryFn: getSupervisorStatistics,
  })

  if (statisticsQuery.isLoading) {
    return <PageSpinner />
  }

  if (statisticsQuery.error) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu thống kê. Vui lòng thử lại."
        onRetry={() => statisticsQuery.refetch()}
      />
    )
  }

  const statistics = statisticsQuery.data

  if (!statistics || statistics.recentSessions.length === 0) {
    return (
      <Card>
        <Empty
          description="Bạn chưa được phân công ca thi nào. Vui lòng liên hệ giáo viên để được phân công."
        />
      </Card>
    )
  }

  // Nhóm vi phạm theo ca thi
  const violationsBySession = statistics.recentSessions.map((session) => {
    const sessionViolations = statistics.studentViolations.filter(
      (v) => v.examInstanceId === session.examInstanceId
    )

    // Tính tổng vi phạm theo loại cho ca thi này
    const violationsByType: Record<string, number> = {}
    sessionViolations.forEach((sv) => {
      Object.entries(sv.violationsByType || {}).forEach(([type, count]) => {
        violationsByType[type] = (violationsByType[type] || 0) + (count as number)
      })
    })

    return {
      ...session,
      violations: sessionViolations,
      violationsByType,
    }
  })

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>Thống kê vi phạm theo ca thi</Typography.Title>
        <Typography.Paragraph type="secondary">
          Danh sách các ca thi bạn được phân công. Click vào từng ca thi để xem chi tiết vi phạm của học sinh.
        </Typography.Paragraph>
      </div>

      {/* Tóm tắt tổng quan */}
      <Card>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Text strong>Tổng số ca thi được phân công: {violationsBySession.length}</Typography.Text>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Typography.Text>
              Tổng vi phạm: <Typography.Text strong style={{ color: statistics.totalViolations > 0 ? '#ff4d4f' : '#52c41a' }}>
                {statistics.totalViolations}
              </Typography.Text>
            </Typography.Text>
            <Typography.Text>
              Tổng sinh viên: <Typography.Text strong>{statistics.totalStudents}</Typography.Text>
            </Typography.Text>
            <Typography.Text>
              Đã hoàn thành: <Typography.Text strong style={{ color: '#52c41a' }}>
                {statistics.completedAttempts}
              </Typography.Text>
            </Typography.Text>
          </div>
        </Space>
      </Card>

      <Collapse
        defaultActiveKey={violationsBySession.map((s) => s.examInstanceId.toString())}
        size="large"
        accordion={false}
      >
        {violationsBySession.map((session) => (
          <Panel
            key={session.examInstanceId}
            header={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                  <Typography.Text strong>{session.examName}</Typography.Text>
                  <Typography.Text type="secondary" style={{ marginLeft: 16 }}>
                    {session.subjectName} - {session.studentGroupName}
                  </Typography.Text>
                </div>
                <Space>
                  <Button
                    type="primary"
                    icon={<FileExcelOutlined />}
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      exportViolationsToExcel(session, statistics.studentViolations || [])
                    }}
                  >
                    Xuất Excel
                  </Button>
                  <Tag color={session.violationsCount > 0 ? 'red' : 'green'}>
                    {session.violationsCount} vi phạm
                  </Tag>
                  <Tag color={session.status === 'ONGOING' ? 'orange' : session.status === 'COMPLETED' ? 'green' : 'default'}>
                    {session.status === 'ONGOING' ? 'Đang diễn ra' : session.status === 'COMPLETED' ? 'Đã kết thúc' : 'Chưa bắt đầu'}
                  </Tag>
                </Space>
              </div>
            }
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Thông tin ca thi */}
              <Card size="small">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary">Thời gian:</Typography.Text>
                    <Typography.Text>
                      {dayjs(session.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(session.endTime).format('DD/MM/YYYY HH:mm')}
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary">Tổng sinh viên:</Typography.Text>
                    <Typography.Text strong>{session.totalStudents}</Typography.Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary">Đã hoàn thành:</Typography.Text>
                    <Typography.Text strong style={{ color: '#52c41a' }}>
                      {session.completedStudents}
                    </Typography.Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary">Tổng vi phạm:</Typography.Text>
                    <Typography.Text strong style={{ color: session.violationsCount > 0 ? '#ff4d4f' : '#52c41a' }}>
                      {session.violationsCount}
                    </Typography.Text>
                  </div>
                </Space>
              </Card>

              {/* Vi phạm theo loại */}
              {Object.keys(session.violationsByType).length > 0 && (
                <Card size="small" title="Vi phạm theo loại">
                  <Space wrap>
                    {Object.entries(session.violationsByType).map(([type, count]) => (
                      <Tag key={type} color="red" style={{ fontSize: 14, padding: '4px 12px' }}>
                        {getViolationLabel(type)}: <strong>{count}</strong>
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

              {/* Danh sách học sinh vi phạm */}
              {session.violations.length > 0 ? (
                <Card size="small" title={`Danh sách học sinh vi phạm (${session.violations.length})`}>
                  <List
                    size="small"
                    dataSource={session.violations}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          borderLeft: item.totalViolations > 0 ? '3px solid #ff4d4f' : '3px solid #52c41a',
                          paddingLeft: 12,
                          marginBottom: 8,
                          backgroundColor: item.totalViolations > 0 ? '#fff1f0' : '#f6ffed',
                        }}
                      >
                        <List.Item.Meta
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography.Text strong>{item.studentName}</Typography.Text>
                              <Tag color={item.totalViolations > 0 ? 'red' : 'green'}>
                                {item.totalViolations} vi phạm
                              </Tag>
                            </div>
                          }
                          description={
                            <div style={{ marginTop: 8 }}>
                              {Object.keys(item.violationsByType || {}).length > 0 ? (
                                <Space wrap size={[4, 4]}>
                                  {Object.entries(item.violationsByType || {}).map(([type, count]) => (
                                    <Tag key={type} color="red" style={{ margin: 0 }}>
                                      {getViolationLabel(type)}: {count}
                                    </Tag>
                                  ))}
                                </Space>
                              ) : (
                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                  Không có vi phạm
                                </Typography.Text>
                              )}
                              {item.lastViolationTime && (
                                <div style={{ marginTop: 4 }}>
                                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    Lần cuối: {dayjs(item.lastViolationTime).format('DD/MM/YYYY HH:mm:ss')}
                                  </Typography.Text>
                                </div>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              ) : (
                <Card size="small">
                  <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                    Không có học sinh nào vi phạm trong ca thi này
                  </Typography.Text>
                </Card>
              )}
            </Space>
          </Panel>
        ))}
      </Collapse>
    </Space>
  )
}

export default SupervisorViolationStatsPage

