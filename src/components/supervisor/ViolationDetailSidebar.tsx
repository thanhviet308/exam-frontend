import { Card, List, Space, Tag, Typography } from 'antd'
import { Layout } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { SupervisorStatistics } from '../../api/supervisor/supervisorApi'

const { Sider } = Layout

interface ViolationDetailSidebarProps {
  visible: boolean
  onClose: () => void
  selectedSession: SupervisorStatistics['recentSessions'][0] | null
  studentViolations: SupervisorStatistics['studentViolations']
}

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

const ViolationDetailSidebar = ({ visible, onClose, selectedSession, studentViolations }: ViolationDetailSidebarProps) => {
  if (!visible || !selectedSession) return null

  // Lọc vi phạm của ca thi được chọn
  const sessionViolations = studentViolations.filter(
    (v) => v.examInstanceId === selectedSession.examInstanceId
  )

  // Tính tổng vi phạm theo loại cho ca thi này
  const violationsByType: Record<string, number> = {}
  sessionViolations.forEach((sv) => {
    Object.entries(sv.violationsByType || {}).forEach(([type, count]) => {
      violationsByType[type] = (violationsByType[type] || 0) + (count as number)
    })
  })

  return (
    <Sider
      width={400}
      style={{
        background: '#fff',
        borderLeft: '1px solid #f0f0f0',
        position: 'fixed',
        right: 0,
        top: 64,
        bottom: 0,
        overflowY: 'auto',
        zIndex: 1000,
      }}
      theme="light"
    >
      <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Chi tiết vi phạm
        </Typography.Title>
        <CloseOutlined
          onClick={onClose}
          style={{ cursor: 'pointer', fontSize: 18, color: '#666' }}
        />
      </div>

      <div style={{ padding: 16 }}>
        {/* Thông tin ca thi */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            {selectedSession.examName}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Môn: {selectedSession.subjectName}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Nhóm: {selectedSession.studentGroupName}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            Thời gian: {dayjs(selectedSession.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(selectedSession.endTime).format('HH:mm')}
          </Typography.Text>
        </Card>

        {/* Thống kê tổng quan */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text>Tổng sinh viên:</Typography.Text>
              <Typography.Text strong>{selectedSession.totalStudents}</Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text>Đã hoàn thành:</Typography.Text>
              <Typography.Text strong style={{ color: '#52c41a' }}>
                {selectedSession.completedStudents}
              </Typography.Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography.Text>Tổng vi phạm:</Typography.Text>
              <Typography.Text strong style={{ color: selectedSession.violationsCount > 0 ? '#ff4d4f' : '#52c41a' }}>
                {selectedSession.violationsCount}
              </Typography.Text>
            </div>
          </Space>
        </Card>

        {/* Vi phạm theo loại */}
        {Object.keys(violationsByType).length > 0 && (
          <Card size="small" title="Vi phạm theo loại" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {Object.entries(violationsByType).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color="red">{getViolationLabel(type)}</Tag>
                  <Typography.Text strong style={{ color: '#ff4d4f' }}>
                    {count}
                  </Typography.Text>
                </div>
              ))}
            </Space>
          </Card>
        )}

        {/* Danh sách học sinh vi phạm */}
        {sessionViolations.length > 0 ? (
          <Card size="small" title={`Học sinh vi phạm (${sessionViolations.length})`}>
            <List
              size="small"
              dataSource={sessionViolations}
              renderItem={(item) => (
                <List.Item
                  style={{
                    borderLeft: item.totalViolations > 0 ? '3px solid #ff4d4f' : '3px solid #52c41a',
                    paddingLeft: 12,
                    marginBottom: 8,
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
      </div>
    </Sider>
  )
}

export default ViolationDetailSidebar

