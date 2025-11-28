import { Card, List, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getStudentExams } from '../../api/student/examsApi'
import { useAuthContext } from '../../context/AuthContext'
import dayjs from 'dayjs'

const StudentDashboard = () => {
  const { user } = useAuthContext()
  const examsQuery = useQuery({
    queryKey: ['student-exams'],
    queryFn: getStudentExams,
  })

  const upcomingExams = examsQuery.data?.filter(
    (exam) => exam.status === 'NOT_STARTED' || exam.status === 'ONGOING',
  ) ?? []
  const completedExams = examsQuery.data?.filter((exam) => exam.status === 'ENDED') ?? []

  return (
    <div>
      <Typography.Title level={3}>
        Chào mừng, {user?.fullName || 'Sinh viên'}!
      </Typography.Title>
      <div style={{ marginTop: 24 }}>
        <Card>
          <Statistic
            title="Kỳ thi sắp diễn ra"
            value={upcomingExams.length}
            loading={examsQuery.isLoading}
          />
        </Card>
        <Card style={{ marginTop: 16 }}>
          <Statistic
            title="Kỳ thi đã hoàn thành"
            value={completedExams.length}
            loading={examsQuery.isLoading}
          />
        </Card>
      </div>

      {upcomingExams.length > 0 && (
        <Card title="Kỳ thi sắp tới" style={{ marginTop: 24 }}>
          <List
            dataSource={upcomingExams}
            loading={examsQuery.isLoading}
            renderItem={(exam) => (
              <List.Item>
                <List.Item.Meta
                  title={exam.name}
                  description={`${exam.subjectName} - Bắt đầu: ${dayjs(exam.startTime).format('DD/MM/YYYY HH:mm')}`}
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}

export default StudentDashboard
