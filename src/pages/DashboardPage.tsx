import { Card, Col, Row, Statistic, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamInstance, ExamStatistics } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const DashboardPage = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [instancesRes, statsRes] = await Promise.all([
        apiClient.get<ExamInstance[]>('/exam-instances/group/1'),
        apiClient.get<ExamStatistics>('/statistics/exam/1'),
      ])
      return { instances: instancesRes.data, stats: statsRes.data }
    },
  })

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  return (
    <>
      <Typography.Title level={3}>Tổng quan</Typography.Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Kỳ thi" value={data?.instances.length ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Điểm TB" value={data?.stats.averageScore ?? 0} suffix={`/ ${data?.stats.maxScore ?? 0}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Bài đã nộp" value={data?.stats.completedAttempts ?? 0} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Tổng bài" value={data?.stats.totalAttempts ?? 0} />
          </Card>
        </Col>
      </Row>
      <Card title="Kỳ thi sắp diễn ra">
        {data?.instances.slice(0, 5).map((item) => (
          <div key={item.id} className="list-item">
            <div>
              <Typography.Text strong>{item.name}</Typography.Text>
              <Typography.Paragraph type="secondary">{new Date(item.startTime).toLocaleString()}</Typography.Paragraph>
            </div>
            <Typography.Text>{item.durationMinutes} phút</Typography.Text>
          </div>
        ))}
      </Card>
    </>
  )
}

export default DashboardPage

