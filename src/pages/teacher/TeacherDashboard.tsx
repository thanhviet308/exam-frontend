import {
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  ClusterOutlined,
  FileExcelOutlined,
  FieldTimeOutlined,
  FormOutlined,
  PieChartOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchQuestions } from '../../api/teacher/questionsApi'
import { fetchTemplates } from '../../api/teacher/examTemplateApi'
import { fetchExamInstances } from '../../api/teacher/examInstanceApi'
import { getSubjects, getSubjectAssignments, getMySubjectAssignments } from '../../api/adminApi'
import { useAuthContext } from '../../context/AuthContext'
import dayjs from 'dayjs'
import { PageSpinner } from '../../components/Loaders'
import type { TeacherQuestion, TeacherTemplate, TeacherExamInstance } from '../../types'
import type { SubjectResponse, SubjectAssignment } from '../../types/models'

const TeacherDashboard = () => {
  const { user } = useAuthContext()
  
  const questionsQuery = useQuery<TeacherQuestion[]>({
    queryKey: ['teacher-questions'],
    queryFn: () => fetchQuestions({}),
  })

  const templatesQuery = useQuery<TeacherTemplate[]>({
    queryKey: ['teacher-templates'],
    queryFn: fetchTemplates,
  })

  const examsQuery = useQuery<TeacherExamInstance[]>({
    queryKey: ['teacher-exams'],
    queryFn: fetchExamInstances,
  })

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
  })

  // Use teacher-specific endpoint to get only assignments for current teacher
  const assignmentsQuery = useQuery<SubjectAssignment[]>({
    queryKey: ['subject-assignments', user?.id],
    queryFn: getMySubjectAssignments,
    enabled: !!user && user.role === 'TEACHER',
  })

  if (questionsQuery.isLoading || templatesQuery.isLoading || examsQuery.isLoading || subjectsQuery.isLoading || assignmentsQuery.isLoading) {
    return <PageSpinner />
  }

  const questions = questionsQuery.data || []
  const templates = templatesQuery.data || []
  const exams = examsQuery.data || []
  const subjects = subjectsQuery.data || []
  const assignments = assignmentsQuery.data || []

  // Calculate unique subjects that teacher is responsible for (based on assignments)
  // API endpoint /my already returns only assignments for current teacher, so no need to filter
  const teacherSubjectIds = new Set<number>()
  assignments.forEach((a) => {
    if (a.subjectId) teacherSubjectIds.add(a.subjectId)
  })

  // Calculate statistics
  const stats = {
    questionBank: questions.length,
    templates: templates.length,
    subjects: teacherSubjectIds.size,
    upcomingExams: exams.filter((exam) => {
      const now = dayjs()
      const startTime = dayjs(exam.startTime)
      return startTime.isAfter(now)
    }).length,
  }

  // Get upcoming exams (next 5 exams)
  const upcomingExams = exams
    .filter((exam) => {
      const now = dayjs()
      const endTime = dayjs(exam.endTime)
      return endTime.isAfter(now)
    })
    .sort((a, b) => dayjs(a.startTime).unix() - dayjs(b.startTime).unix())
    .slice(0, 5)
    .map((exam) => {
      const now = dayjs()
      const startTime = dayjs(exam.startTime)
      const endTime = dayjs(exam.endTime)
      let status: 'Sắp diễn ra' | 'Đang thi' | 'Đã kết thúc' = 'Sắp diễn ra'
      if (now.isAfter(startTime) && now.isBefore(endTime)) {
        status = 'Đang thi'
      } else if (now.isAfter(endTime)) {
        status = 'Đã kết thúc'
      }
      return {
        id: exam.id,
        subject: exam.templateName,
        className: exam.studentGroupName,
        time: `${dayjs(exam.startTime).format('DD/MM HH:mm')} - ${dayjs(exam.endTime).format('HH:mm')}`,
        duration: `${exam.durationMinutes} phút`,
        status,
      }
    })

  // Questions by subject
  const questionsBySubject = subjects.map((subject) => {
    const count = questions.filter((q) => q.subjectId === subject.id).length
    return { subject: subject.name, count }
  }).filter((item) => item.count > 0)

  // Exams by month
  const examsByMonthMap = new Map<string, number>()
  exams.forEach((exam) => {
    const month = dayjs(exam.startTime).format('MM')
    examsByMonthMap.set(month, (examsByMonthMap.get(month) || 0) + 1)
  })
  const examsByMonth = Array.from(examsByMonthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const getStatusColor = (status: 'Sắp diễn ra' | 'Đang thi' | 'Đã kết thúc') => {
    if (status === 'Đang thi') return 'processing'
    if (status === 'Đã kết thúc') return 'default'
    return 'success'
  }

  return (
  <div className="p-4">
    {/* Header + Quick actions + Stats */}
    <Card bordered={false} className="teacher-hero-card teacher-card">
      <Row gutter={[24, 24]} align="middle">
        <Col xs={24} md={14}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Không gian giáo viên
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16, maxWidth: 520 }}>
            Quản lý ngân hàng câu hỏi, khung đề và các kỳ thi trắc nghiệm cho lớp học của bạn.
          </Typography.Paragraph>

          <Space wrap>
            <Link to="/teacher/exams">
              <Button type="primary" icon={<PlusOutlined />}>
                Tạo kỳ thi mới
              </Button>
            </Link>
            <Link to="/teacher/templates">
              <Button icon={<ClusterOutlined />}>
                Tạo khung đề
              </Button>
            </Link>
            <Link to="/teacher/questions">
              <Button icon={<FormOutlined />}>
                Thêm câu hỏi
              </Button>
            </Link>
            <Button icon={<FileExcelOutlined />}>
              Nhập từ Excel
            </Button>
          </Space>
        </Col>

        <Col xs={24} md={10}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" bordered={false} className="teacher-card" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Ngân hàng câu hỏi"
                  value={stats.questionBank}
                  prefix={<FormOutlined style={{ color: '#2563eb' }} />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" bordered={false} className="teacher-card" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Khung đề"
                  value={stats.templates}
                  prefix={<ClusterOutlined style={{ color: '#22c55e' }} />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" bordered={false} className="teacher-card" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Môn phụ trách"
                  value={stats.subjects}
                  prefix={<BookOutlined style={{ color: '#a855f7' }} />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" bordered={false} className="teacher-card" style={{ borderRadius: 12 }}>
                <Statistic
                  title="Kỳ thi sắp tới"
                  value={stats.upcomingExams}
                  prefix={<FieldTimeOutlined style={{ color: '#f97316' }} />}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>

    {/* Main content */}
    <Row gutter={[24, 24]} className="mt-6">
      {/* Left column: Upcoming exams */}
      <Col xs={24} lg={16}>
        <Card
          title={
            <Space>
              <CalendarOutlined />
              <span>Kỳ thi sắp diễn ra</span>
            </Space>
          }
          bordered={false}
          className="teacher-card"
          style={{ marginBottom: 24 }}
          extra={
            <Link to="/teacher/exams" style={{ fontSize: 13 }}>
              Xem tất cả
            </Link>
          }
        >
          {upcomingExams.length === 0 ? (
            <Empty description="Chưa có kỳ thi nào sắp diễn ra" />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={upcomingExams}
              renderItem={(exam: { id: number; subject: string; className: string; time: string; duration: string; status: 'Sắp diễn ra' | 'Đang thi' | 'Đã kết thúc' }) => (
              <List.Item key={exam.id}>
                <List.Item.Meta
                  title={
                    <Space size="middle">
                      <Typography.Text strong>{exam.subject}</Typography.Text>
                      <Tag color="blue">{exam.className}</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Typography.Text type="secondary">{exam.time}</Typography.Text>
                      <Space size="small">
                        <FieldTimeOutlined />
                        <Typography.Text type="secondary">{exam.duration}</Typography.Text>
                      </Space>
                    </Space>
                  }
                />
                <Badge status={getStatusColor(exam.status)} text={exam.status} />
              </List.Item>
            )}
            />
          )}
        </Card>
      </Col>

      {/* Right column: Charts */}
      <Col xs={24} lg={8}>
        <Card
          title={
            <Space>
              <PieChartOutlined />
              <span>Câu hỏi theo môn</span>
            </Space>
          }
          bordered={false}
          className="teacher-card"
          style={{ marginBottom: 24 }}
        >
          {questionsBySubject.length === 0 ? (
            <Empty description="Chưa có câu hỏi nào" />
          ) : (
            <>
              <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
                {questionsBySubject.map((item: { subject: string; count: number }) => (
                  <Col span={24} key={item.subject}>
                    <Space
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <Typography.Text type="secondary">{item.subject}</Typography.Text>
                      <Typography.Text strong>{item.count} câu</Typography.Text>
                    </Space>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Card>

        <Card
          title={
            <Space>
              <BarChartOutlined />
              <span>Kỳ thi theo tháng</span>
            </Space>
          }
          bordered={false}
          className="teacher-card"
        >
          {examsByMonth.length === 0 ? (
            <Empty description="Chưa có kỳ thi nào" />
          ) : (
            <div>
              {examsByMonth.map((item) => {
                const maxCount = Math.max(...examsByMonth.map((e) => e.count), 1)
                return (
                  <div
                    key={item.month}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ width: 32, color: '#6b7280', fontSize: 12 }}>{item.month}</div>
                    <div
                      style={{
                        flex: 1,
                        background: '#e5e7eb',
                        borderRadius: 999,
                        overflow: 'hidden',
                        marginRight: 8,
                      }}
                    >
                      <div
                        style={{
                          width: `${(item.count / maxCount) * 100}%`,
                          background: '#2563eb',
                          height: 8,
                        }}
                      />
                    </div>
                    <Typography.Text strong>{item.count}</Typography.Text>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </Col>
    </Row>
  </div>
  )
}

export default TeacherDashboard
