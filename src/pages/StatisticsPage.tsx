import { Card, Col, Row, Typography } from 'antd'
import { Column, Pie } from '@ant-design/charts'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import type { ExamStatistics } from '../types'
import { ErrorState, PageSpinner } from '../components/Loaders'

const StatisticsPage = () => {
  const statsQuery = useQuery({
    queryKey: ['statistics'],
    queryFn: async () => (await apiClient.get<ExamStatistics>('/statistics/exam/1')).data,
  })

  if (statsQuery.isLoading) return <PageSpinner />
  if (statsQuery.error || !statsQuery.data) {
    return <ErrorState message={(statsQuery.error as Error)?.message} onRetry={() => statsQuery.refetch()} />
  }

  const distributionData = Object.entries(statsQuery.data.scoreDistribution).map(([range, value]) => ({
    range,
    value,
  }))

  const chapterData = statsQuery.data.chapterAccuracy.map((item) => ({
    chapter: item.chapterName || `Chapter ${item.chapterId}`,
    value: (item.correctRate * 100).toFixed(2),
  }))

  return (
    <>
      <Typography.Title level={3}>Thống kê kỳ thi</Typography.Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Phân bố điểm">
            <Column data={distributionData} xField="range" yField="value" height={320} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Độ chính xác theo chương">
            <Pie
              data={chapterData}
              angleField="value"
              colorField="chapter"
              height={320}
              label={{ type: 'inner', offset: '-30%', content: '{name}\n{value}%' }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default StatisticsPage

