import { Card, Col, Row, Statistic, Typography, Space } from 'antd'
import { UserOutlined, TeamOutlined, BookOutlined, FileTextOutlined, QuestionCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Column, Pie } from '@ant-design/charts'
import { getUsers, getStudentGroups, getSubjects } from '../../api/adminApi'
import { getAllExamInstances, getExamTemplates } from '../../api/examApi'
import { fetchQuestions } from '../../api/teacher/questionsApi'
import { getAttemptsForExam } from '../../api/examApi'
import dayjs from 'dayjs'
import { PageSpinner, ErrorState } from '../../components/Loaders'

const AdminStatisticsPage = () => {
  const usersQuery = useQuery({ queryKey: ['admin-statistics-users'], queryFn: getUsers })
  const groupsQuery = useQuery({ queryKey: ['admin-statistics-groups'], queryFn: getStudentGroups })
  const subjectsQuery = useQuery({ queryKey: ['admin-statistics-subjects'], queryFn: getSubjects })
  const examsQuery = useQuery({ queryKey: ['admin-statistics-exams'], queryFn: getAllExamInstances })
  const templatesQuery = useQuery({ queryKey: ['admin-statistics-templates'], queryFn: getExamTemplates })
  const questionsQuery = useQuery({
    queryKey: ['admin-statistics-questions'],
    queryFn: () => fetchQuestions({}),
  })

  // Tính toán thống kê
  const users = usersQuery.data || []
  const usersByRole = {
    ADMIN: users.filter((u) => u.role === 'ADMIN').length,
    TEACHER: users.filter((u) => u.role === 'TEACHER').length,
    STUDENT: users.filter((u) => u.role === 'STUDENT').length,
    SUPERVISOR: users.filter((u) => u.role === 'SUPERVISOR').length,
  }

  const exams = examsQuery.data || []
  const now = dayjs()
  const examStatusCounts = {
    SCHEDULED: exams.filter((e) => dayjs(e.startTime).isAfter(now)).length,
    ONGOING: exams.filter((e) => dayjs(e.startTime).isBefore(now) && dayjs(e.endTime).isAfter(now)).length,
    COMPLETED: exams.filter((e) => dayjs(e.endTime).isBefore(now)).length,
  }

  // Tính tổng số bài thi đã làm (cần fetch từ tất cả các kỳ thi)
  const allAttemptsQuery = useQuery({
    queryKey: ['admin-statistics-attempts', exams.length],
    queryFn: async () => {
      if (exams.length === 0) return []
      // Lấy attempts từ một số kỳ thi mẫu để ước tính
      const sampleExams = exams.slice(0, Math.min(10, exams.length))
      const attemptsPromises = sampleExams.map((exam) =>
        getAttemptsForExam(exam.id).catch((error) => {
          console.warn(`Failed to fetch attempts for exam ${exam.id}:`, error)
          return []
        })
      )
      const attemptsArrays = await Promise.all(attemptsPromises)
      return attemptsArrays.flat()
    },
    enabled: exams.length > 0 && !examsQuery.isLoading && !examsQuery.error,
    retry: false, // Không retry để tránh làm chậm trang
  })

  const totalAttempts = allAttemptsQuery.data?.length || 0
  const completedAttempts = allAttemptsQuery.data?.filter((a) => a.status === 'SUBMITTED' || a.status === 'GRADED').length || 0

  // Dữ liệu cho biểu đồ
  const userRoleData = [
    { type: 'Quản trị viên', value: usersByRole.ADMIN },
    { type: 'Giáo viên', value: usersByRole.TEACHER },
    { type: 'Sinh viên', value: usersByRole.STUDENT },
    { type: 'Giám thị', value: usersByRole.SUPERVISOR },
  ].filter((item) => item.value > 0)

  const examStatusData = [
    { type: 'Chưa bắt đầu', value: examStatusCounts.SCHEDULED },
    { type: 'Đang diễn ra', value: examStatusCounts.ONGOING },
    { type: 'Đã kết thúc', value: examStatusCounts.COMPLETED },
  ].filter((item) => item.value > 0)

  // Thống kê câu hỏi theo môn học
  const questions = questionsQuery.data || []
  const questionsBySubject = new Map<number, number>()
  questions.forEach((q) => {
    if (q.chapter?.subjectId) {
      questionsBySubject.set(q.chapter.subjectId, (questionsBySubject.get(q.chapter.subjectId) || 0) + 1)
    }
  })

  const subjectStats = (subjectsQuery.data || [])
    .map((subject) => ({
      subject: subject.name,
      count: questionsBySubject.get(subject.id) || 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const isLoading =
    (usersQuery.isLoading && !usersQuery.data) ||
    (groupsQuery.isLoading && !groupsQuery.data) ||
    (subjectsQuery.isLoading && !subjectsQuery.data) ||
    (examsQuery.isLoading && !examsQuery.data) ||
    (templatesQuery.isLoading && !templatesQuery.data) ||
    (questionsQuery.isLoading && !questionsQuery.data)

  // Chỉ hiển thị lỗi nếu tất cả các query quan trọng đều lỗi và không có dữ liệu
  const criticalQueries = [usersQuery, subjectsQuery, examsQuery]
  const allCriticalQueriesHaveError = criticalQueries.every((q) => q.error && !q.data)
  const hasAnyData = criticalQueries.some((q) => q.data)

  if (isLoading && !hasAnyData) {
    return <PageSpinner />
  }

  if (allCriticalQueriesHaveError && !hasAnyData) {
    return (
      <ErrorState
        message="Không thể tải dữ liệu thống kê. Vui lòng thử lại."
        onRetry={() => {
          usersQuery.refetch()
          groupsQuery.refetch()
          subjectsQuery.refetch()
          examsQuery.refetch()
          templatesQuery.refetch()
          questionsQuery.refetch()
        }}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Thống kê hệ thống</Typography.Title>

      {/* Tổng quan */}
      <Card title="Tổng quan hệ thống">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số người dùng"
                value={users.length}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số nhóm sinh viên"
                value={groupsQuery.data?.length || 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số môn học"
                value={subjectsQuery.data?.length || 0}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số kỳ thi"
                value={exams.length}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số khung đề"
                value={templatesQuery.data?.length || 0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số câu hỏi"
                value={questions.length}
                prefix={<QuestionCircleOutlined />}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số bài thi"
                value={totalAttempts}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Bài thi đã hoàn thành"
                value={completedAttempts}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Biểu đồ */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Phân bố người dùng theo vai trò">
            {userRoleData.length > 0 ? (
              <Pie
                data={userRoleData}
                angleField="value"
                colorField="type"
                radius={0.8}
                label={{
                  type: 'outer',
                  content: '{name}\n{value} người',
                }}
                interactions={[{ type: 'element-active' }]}
              />
            ) : (
              <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Thống kê kỳ thi theo trạng thái">
            {examStatusData.length > 0 ? (
              <Pie
                data={examStatusData}
                angleField="value"
                colorField="type"
                radius={0.8}
                color={['#1890ff', '#faad14', '#52c41a']}
                label={{
                  type: 'outer',
                  content: '{name}\n{value} ca thi',
                }}
                interactions={[{ type: 'element-active' }]}
              />
            ) : (
              <Typography.Text type="secondary">Chưa có dữ liệu</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Top môn học có nhiều câu hỏi nhất */}
      {subjectStats.length > 0 && (
        <Card title="Top 5 môn học có nhiều câu hỏi nhất">
          <Column
            data={subjectStats}
            xField="subject"
            yField="count"
            color="#1890ff"
            label={{
              position: 'top',
              formatter: (datum) => `${datum.count} câu`,
            }}
            columnStyle={{
              radius: [4, 4, 0, 0],
            }}
          />
        </Card>
      )}

      {/* Chi tiết người dùng theo vai trò */}
      <Card title="Chi tiết người dùng theo vai trò">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title="Quản trị viên" value={usersByRole.ADMIN} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title="Giáo viên" value={usersByRole.TEACHER} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title="Sinh viên" value={usersByRole.STUDENT} valueStyle={{ color: '#fa8c16' }} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title="Giám thị" value={usersByRole.SUPERVISOR} valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
      </Card>

      {/* Chi tiết kỳ thi theo trạng thái */}
      <Card title="Chi tiết kỳ thi theo trạng thái">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Statistic
              title="Chưa bắt đầu"
              value={examStatusCounts.SCHEDULED}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Statistic title="Đang diễn ra" value={examStatusCounts.ONGOING} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Statistic title="Đã kết thúc" value={examStatusCounts.COMPLETED} valueStyle={{ color: '#52c41a' }} />
          </Col>
        </Row>
      </Card>
    </Space>
  )
}

export default AdminStatisticsPage
