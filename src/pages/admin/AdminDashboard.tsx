import { Card, Col, Row, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { getUsers, getStudentGroups, getSubjects } from '../../api/adminApi'
import { getAllExamInstances } from '../../api/examApi'

const AdminDashboard = () => {
  const usersQuery = useQuery({ queryKey: ['admin-users-dashboard'], queryFn: getUsers })
  const groupsQuery = useQuery({ queryKey: ['admin-groups-dashboard'], queryFn: getStudentGroups })
  const subjectsQuery = useQuery({ queryKey: ['admin-subjects-dashboard'], queryFn: getSubjects })
  const examsQuery = useQuery({ queryKey: ['admin-exams-dashboard'], queryFn: getAllExamInstances })

  return (
    <div className="space-y-6">
      <Typography.Title level={3}>Tổng quan hệ thống</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card">
            <Statistic
              title="Tổng số người dùng"
              value={usersQuery.data?.length ?? 0}
              loading={usersQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card">
            <Statistic
              title="Tổng số nhóm sinh viên"
              value={groupsQuery.data?.length ?? 0}
              loading={groupsQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card">
            <Statistic
              title="Tổng số môn học"
              value={subjectsQuery.data?.length ?? 0}
              loading={subjectsQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card">
            <Statistic
              title="Tổng số kỳ thi"
              value={examsQuery.data?.length ?? 0}
              loading={examsQuery.isLoading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AdminDashboard
