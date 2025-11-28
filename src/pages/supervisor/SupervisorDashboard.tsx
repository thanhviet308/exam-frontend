import { Card, Col, List, Row, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getSupervisorSessions } from '../../api/supervisor/supervisorApi'
import dayjs from 'dayjs'

const SupervisorDashboard = () => {
  const sessionsQuery = useQuery({
    queryKey: ['supervisor-sessions'],
    queryFn: getSupervisorSessions,
  })

  const today = dayjs().startOf('day')
  const todaySessions = sessionsQuery.data?.filter((session) =>
    dayjs(session.startTime).isSame(today, 'day'),
  ) ?? []
  const ongoingSessions = sessionsQuery.data?.filter((session) => session.status === 'ONGOING') ?? []
  const completedSessions = sessionsQuery.data?.filter((session) => session.status === 'COMPLETED') ?? []

  return (
    <div>
      <Typography.Title level={3}>Tổng quan ca thi</Typography.Title>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Ca thi hôm nay"
              value={todaySessions.length}
              loading={sessionsQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Ca đang diễn ra"
              value={ongoingSessions.length}
              loading={sessionsQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Ca đã kết thúc"
              value={completedSessions.length}
              loading={sessionsQuery.isLoading}
            />
          </Card>
        </Col>
      </Row>

      {todaySessions.length > 0 && (
        <Card title="Ca thi hôm nay" style={{ marginTop: 24 }}>
          <List
            dataSource={todaySessions}
            loading={sessionsQuery.isLoading}
            renderItem={(session) => (
              <List.Item>
                <List.Item.Meta
                  title={session.examName}
                  description={`${session.subjectName} - ${session.studentGroupName} - Phòng: ${session.roomNumber || 'Chưa xác định'}`}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}

export default SupervisorDashboard
