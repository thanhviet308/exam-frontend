import { useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, FileExcelOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TeacherQuestion } from '../../types'
import {
  bulkCreateQuestions,
  createQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestion,
} from '../../api/teacher/questionsApi'
import type { QuestionFilter, QuestionPayload } from '../../api/teacher/questionsApi'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { getSubjects, getChapters, getSubjectAssignments, getMySubjectAssignments } from '../../api/adminApi'
import { getPassages } from '../../api/questionApi'
import { useAuthContext } from '../../context/AuthContext'
import type { SubjectResponse, ChapterResponse, CreateQuestionRequest, SubjectAssignment, PassageResponse } from '../../types/models'
import { parseExcelFile, generateSampleExcel } from '../../utils/excelParser'

const QuestionBankPage = () => {
  const { user } = useAuthContext()
  const [filters, setFilters] = useState<QuestionFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editing, setEditing] = useState<TeacherQuestion | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined)
  const [form] = Form.useForm()
  const [importForm] = Form.useForm()
  const [duplicatesModalOpen, setDuplicatesModalOpen] = useState(false)
  const [importResult, setImportResult] = useState<{
    created: number
    duplicates: any[]
    totalProcessed: number
    totalDuplicates: number
  } | null>(null)
  const queryClient = useQueryClient()

  const questionQuery = useQuery<TeacherQuestion[]>({
    queryKey: ['teacher-questions', filters],
    queryFn: () => fetchQuestions(filters),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData, // Keep previous data to prevent flash
    notifyOnChangeProps: ['data', 'error'], // Only re-render on data/error changes, not on loading states
  })

  const subjectsQuery = useQuery<SubjectResponse[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Use teacher-specific endpoint to get only assignments for current teacher
  const assignmentsQuery = useQuery<SubjectAssignment[]>({
    queryKey: ['subject-assignments', user?.id],
    queryFn: getMySubjectAssignments,
    enabled: !!user && user.role === 'TEACHER',
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const chaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', filters.subjectId],
    queryFn: () => (filters.subjectId ? getChapters(filters.subjectId) : Promise.resolve([])),
    enabled: !!filters.subjectId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: (previousData) => previousData, // Keep previous data to prevent flash
  })

  const formChaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', selectedSubjectId],
    queryFn: () => (selectedSubjectId ? getChapters(selectedSubjectId) : Promise.resolve([])),
    enabled: !!selectedSubjectId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  // Query to fetch passages for selected chapter in the form
  const formPassagesQuery = useQuery<PassageResponse[]>({
    queryKey: ['passages', selectedChapterId],
    queryFn: () => (selectedChapterId ? getPassages(selectedChapterId) : Promise.resolve([])),
    enabled: !!selectedChapterId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const createOrUpdateMutation = useMutation({
    mutationFn: async (values: QuestionPayload) => {
      if (editing) {
        return updateQuestion(editing.id, values)
      }
      return createQuestion(values)
    },
    onSuccess: () => {
      message.success(editing ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi mới')
      queryClient.invalidateQueries({ queryKey: ['teacher-questions'] })
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể lưu câu hỏi. Vui lòng thử lại.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteQuestion(id),
    onSuccess: () => {
      message.success('Đã xoá câu hỏi')
      queryClient.invalidateQueries({ queryKey: ['teacher-questions'] })
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || 'Không thể xóa câu hỏi. Vui lòng thử lại.'
      message.error(errorMessage)
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: async (requests: CreateQuestionRequest[]) => {
      return await bulkCreateQuestions(requests)
    },
    onSuccess: (data) => {
      const { created, duplicates, totalCreated, totalDuplicates } = data
      
      if (totalDuplicates > 0) {
        setImportResult({
          created: totalCreated,
          duplicates,
          totalProcessed: data.totalProcessed,
          totalDuplicates,
        })
        setDuplicatesModalOpen(true)
        message.warning(
          `Đã import thành công ${totalCreated} câu hỏi. Có ${totalDuplicates} câu hỏi bị bỏ qua do trùng lặp.`
        )
      } else {
        message.success(`Đã import thành công ${totalCreated} câu hỏi`)
      }
      
      queryClient.invalidateQueries({ queryKey: ['teacher-questions'] })
      setImportModalOpen(false)
      importForm.resetFields()
    },
    onError: (error: any) => {
      console.error('Import error:', error)
      const errorMessage = 
        error?.response?.data?.message || 
        error?.response?.data?.error || 
        error?.message || 
        'Không thể import câu hỏi. Vui lòng thử lại.'
      message.error(errorMessage)
      
      // Log chi tiết lỗi để debug
      if (error?.response?.data) {
        console.error('Error details:', error.response.data)
      }
    },
  })

  const columns: ColumnsType<TeacherQuestion> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: 'Môn học', dataIndex: 'subjectName' },
    { title: 'Chương', dataIndex: 'chapterName' },
    {
      title: 'Loại',
      dataIndex: 'questionType',
      render: (type: TeacherQuestion['questionType']) => (
        <Tag color={type === 'MCQ' ? 'blue' : 'green'}>{type === 'MCQ' ? 'Trắc nghiệm' : 'Điền'} </Tag>
      ),
    },
    {
      title: 'Độ khó',
      dataIndex: 'difficulty',
      render: (difficulty: string) => {
        if (!difficulty) return <Tag>-</Tag>
        const isAdvanced = difficulty.toUpperCase() === 'ADVANCED' || difficulty.toUpperCase() === 'NÂNG CAO'
        return (
          <Tag color={isAdvanced ? 'red' : 'green'}>
            {isAdvanced ? 'Nâng cao' : 'Cơ bản'}
          </Tag>
        )
      },
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      render: (value: string) => <Typography.Paragraph ellipsis={{ rows: 2 }}>{value}</Typography.Paragraph>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: 'Thao tác',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc muốn xóa câu hỏi này?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              loading={deleteMutation.isPending}
            >
              Xoá
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEdit = (question: TeacherQuestion) => {
    setEditing(question)
    setSelectedSubjectId(question.subjectId)
    setSelectedChapterId(question.chapterId)
    setModalOpen(true)
    form.setFieldsValue({
      subjectId: question.subjectId,
      chapterId: question.chapterId,
      passageId: question.passageId,
      questionType: question.questionType,
      content: question.content,
      difficulty: question.difficulty,
      options: question.options?.map((option) => ({
        content: option.content,
        isCorrect: option.isCorrect,
      })),
      answers: question.answers ?? [''],
    })
  }

  const handleAdd = () => {
    setSelectedSubjectId(undefined)
    setSelectedChapterId(undefined)
    form.resetFields()
    form.setFieldsValue({
      questionType: 'MCQ',
      difficulty: 'BASIC',
      options: [
        { content: '', isCorrect: true },
        { content: '', isCorrect: false },
      ],
      answers: [''],
    })
    setEditing(null)
    setModalOpen(true)
  }

  const handleSubmit = (values: any) => {
    const subject = subjectsQuery.data?.find((s) => s.id === values.subjectId)
    const chapter = formChaptersQuery.data?.find((c) => c.id === values.chapterId)
    if (values.questionType === 'MCQ') {
      const hasCorrect = values.options?.some((option: { isCorrect: boolean }) => option.isCorrect)
      if (!hasCorrect) {
        message.error('Cần ít nhất 1 phương án đúng')
        return
      }
    }
    const payload: QuestionPayload = {
      subjectId: values.subjectId,
      subjectName: subject?.name ?? '',
      chapterId: values.chapterId,
      chapterName: chapter?.name ?? '',
      questionType: values.questionType,
      content: values.content,
      difficulty: values.difficulty,
      marks: 1, // Mặc định là 1, sẽ được tính lại khi tạo đề thi
      passageId: values.passageId,
      options: values.questionType === 'MCQ' ? values.options : undefined,
      answers: values.questionType === 'FILL' ? values.answers : undefined,
    }
    createOrUpdateMutation.mutate(payload)
  }

  if (questionQuery.isLoading || subjectsQuery.isLoading || assignmentsQuery.isLoading) {
    return <PageSpinner />
  }

  if (questionQuery.error) {
    return (
      <ErrorState
        message={(questionQuery.error as Error).message || 'Không thể tải danh sách câu hỏi'}
        onRetry={() => questionQuery.refetch()}
      />
    )
  }

  // Calculate unique subjects that teacher is responsible for (based on assignments)
  // API endpoint /my already returns only assignments for current teacher, so no need to filter
  const assignments = assignmentsQuery.data || []
  const teacherSubjectIds = new Set<number>()
  assignments.forEach((a) => {
    if (a.subjectId) teacherSubjectIds.add(a.subjectId)
  })

  // Filter subjects to only show those the teacher is responsible for
  const availableSubjects = (subjectsQuery.data || []).filter((subject) => teacherSubjectIds.has(subject.id))
  
  // Log để debug
  if (assignmentsQuery.isError) {
    console.error('Error loading assignments:', assignmentsQuery.error)
  }
  if (subjectsQuery.isError) {
    console.error('Error loading subjects:', subjectsQuery.error)
  }
  console.log('Teacher assignments:', assignments.length)
  console.log('Available subjects for teacher:', availableSubjects.length, availableSubjects.map(s => s.name))

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        Ngân hàng câu hỏi
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Quản lý toàn bộ câu hỏi theo môn, chương và mức độ để tái sử dụng trong nhiều đề thi.
      </Typography.Paragraph>
      <Card style={{ borderRadius: 16 }}>
        <Space wrap align="center" style={{ width: '100%' }}>
          <Space>
            <span>Môn học:</span>
            <Select
              allowClear
              placeholder="Chọn môn"
              style={{ width: 200 }}
              value={filters.subjectId}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, subjectId: value, chapterId: undefined }))
              }}
            >
              {availableSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Space>
            <span>Chương:</span>
            <Select
              allowClear
              placeholder="Chọn chương"
              style={{ width: 200 }}
              disabled={!filters.subjectId}
              value={filters.chapterId}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, chapterId: value }))
              }}
            >
              {chaptersQuery.data?.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </Select.Option>
              ))}
            </Select>
          </Space>
          <Space>
            <span>Loại câu:</span>
            <Select
              allowClear
              placeholder="Loại"
              style={{ width: 150 }}
              value={filters.questionType}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, questionType: value }))
              }}
            >
              <Select.Option value="MCQ">Trắc nghiệm</Select.Option>
              <Select.Option value="FILL">Điền</Select.Option>
            </Select>
          </Space>
          <Space>
            <span>Độ khó:</span>
            <Select
              allowClear
              placeholder="Độ khó"
              style={{ width: 150 }}
              value={filters.difficulty}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, difficulty: value }))
              }}
            >
              <Select.Option value="BASIC">Cơ bản</Select.Option>
              <Select.Option value="ADVANCED">Nâng cao</Select.Option>
            </Select>
          </Space>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Button icon={<FileExcelOutlined />} onClick={() => setImportModalOpen(true)}>
              Nhập từ Excel/CSV
            </Button>
            <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
              Thêm câu hỏi
            </Button>
          </div>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Table
          rowKey="id"
          loading={questionQuery.isFetching && !questionQuery.data}
          columns={columns}
          dataSource={questionQuery.data || []}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
        onOk={() => form.submit()}
        confirmLoading={createOrUpdateMutation.isPending}
        width={760}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={handleSubmit}>
          <Form.Item name="subjectId" label="Môn học" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn môn học"
              onChange={(value) => {
                setSelectedSubjectId(value)
                setSelectedChapterId(undefined)
                form.setFieldsValue({ chapterId: undefined, passageId: undefined })
              }}
            >
              {availableSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="chapterId" label="Chương" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn chương"
              disabled={!selectedSubjectId}
              onChange={(value) => {
                setSelectedChapterId(value)
                form.setFieldsValue({ passageId: undefined })
              }}
            >
              {formChaptersQuery.data?.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="passageId"
            label="Đoạn văn (tùy chọn)"
            tooltip="Chọn đoạn văn nếu câu hỏi này thuộc dạng đọc hiểu"
          >
            <Select
              placeholder="Chọn đoạn văn (nếu có)"
              disabled={!selectedChapterId}
              allowClear
            >
              {formPassagesQuery.data?.map((passage) => (
                <Select.Option key={passage.id} value={passage.id}>
                  <Typography.Text ellipsis style={{ maxWidth: 400 }}>
                    {passage.content.substring(0, 80)}...
                  </Typography.Text>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="questionType" label="Loại câu hỏi" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="MCQ">Trắc nghiệm</Radio>
              <Radio value="FILL">Điền</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="difficulty" label="Độ khó" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="BASIC">Cơ bản</Select.Option>
              <Select.Option value="ADVANCED">Nâng cao</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.questionType !== curr.questionType}>
            {({ getFieldValue }) =>
              getFieldValue('questionType') === 'MCQ' ? (
                <Form.List name="options">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline" style={{ width: '100%' }}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'content']}
                            fieldKey={[field.fieldKey!, 'content']}
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="Nội dung phương án" />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'isCorrect']}
                            fieldKey={[field.fieldKey!, 'isCorrect']}
                            valuePropName="checked"
                          >
                            <Checkbox>Đúng</Checkbox>
                          </Form.Item>
                          <Button type="link" danger onClick={() => remove(field.name)}>
                            Xoá
                          </Button>
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add({ content: '', isCorrect: false })} block>
                        Thêm phương án
                      </Button>
                    </Space>
                  )}
                </Form.List>
              ) : (
                <Form.List name="answers">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {fields.map((field) => (
                        <Space key={field.key} align="baseline" style={{ width: '100%' }}>
                          <Form.Item
                            {...field}
                            name={field.name}
                            fieldKey={field.fieldKey}
                            rules={[{ required: true }]}
                            style={{ flex: 1 }}
                          >
                            <Input placeholder="Đáp án chấp nhận" />
                          </Form.Item>
                          <Button type="link" danger onClick={() => remove(field.name)}>
                            Xoá
                          </Button>
                        </Space>
                      ))}
                      <Button type="dashed" onClick={() => add('')} block>
                        Thêm đáp án
                      </Button>
                    </Space>
                  )}
                </Form.List>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={importModalOpen}
        title="Nhập nhiều câu hỏi từ Excel/CSV"
        onCancel={() => {
          setImportModalOpen(false)
          importForm.resetFields()
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={5}>Hướng dẫn</Typography.Title>
            <Typography.Paragraph type="secondary">
              Tải file mẫu để xem định dạng Excel đúng. File Excel cần có các cột sau:
              <br />
              • <strong>Môn học, Chương, Đoạn văn (tùy chọn), Nội dung, Loại câu hỏi</strong> (Trắc nghiệm/Điền hoặc MCQ/FILL), <strong>Độ khó</strong> (Cơ bản/Nâng cao)
              <br />
              • <strong>Đoạn văn</strong>: ID đoạn văn hoặc để trống nếu câu hỏi không thuộc đoạn văn nào
              <br />
              • <strong>Loại câu hỏi</strong>: "Trắc nghiệm" hoặc "Điền" (có thể dùng "MCQ" hoặc "FILL")
              <br />
              • <strong>Lưu ý</strong>: Điểm số của câu hỏi sẽ được tính tự động khi tạo đề thi dựa trên tổng điểm và số lượng câu hỏi
              <br />
              <br />
              <strong>Với câu hỏi Trắc nghiệm:</strong>
              <br />
              • Cần có cột <strong>Phương án 1, Phương án 2, Phương án 3, Phương án 4</strong> (tối thiểu 2 phương án)
              <br />
              • Cột <strong>Đáp án đúng</strong>: Nhập A/B/C/D hoặc 1/2/3/4 tương ứng với phương án đúng
              <br />
              <br />
              <strong>Với câu hỏi Điền (Fill-in-the-blank):</strong>
              <br />
              • Câu hỏi điền là dạng câu hỏi yêu cầu học sinh điền từ/cụm từ vào chỗ trống
              <br />
              • <strong>Ví dụ:</strong> "Thủ đô của Việt Nam là ___" → Học sinh cần điền "Hà Nội"
              <br />
              • <strong>Cách nhập đáp án:</strong> Nhập các đáp án đúng vào các cột <strong>Đáp án 1, Đáp án 2, Đáp án 3, ...</strong> (tối đa 10 đáp án, cần ít nhất 1 đáp án)
              <br />
              <br />
              <strong>📝 Hướng dẫn nhập đáp án cho giáo viên:</strong>
              <br />
              • <strong>Với tiếng Việt:</strong> Nhập đáp án có dấu đầy đủ, đúng chính tả
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;→ Hệ thống tự động chấp nhận cả chữ hoa và chữ thường
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;→ Ví dụ: Nếu bạn nhập "Hà Nội", học sinh ghi "Hà Nội", "hà nội", hoặc "HÀ NỘI" đều được tính đúng
              <br />
              • <strong>Không cần nhập:</strong> Các biến thể không dấu (như "Ha Noi", "Hanoi") vì hệ thống sẽ không chấp nhận
              <br />
              • <strong>Nếu có nhiều cách viết đúng:</strong> Nhập từng cách vào các cột riêng
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;Ví dụ: Câu hỏi "Thủ đô của Việt Nam là ___"
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ Đáp án 1: "Hà Nội"
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ Đáp án 2: "Hà nội" (nếu muốn chấp nhận cả cách viết này)
              <br />
              <br />
              <strong>💡 Tóm lại:</strong> Chỉ cần nhập đáp án có dấu đầy đủ, đúng chính tả. Hệ thống sẽ tự động chấp nhận cả chữ hoa và chữ thường, không cần nhập nhiều biến thể về chữ hoa/thường
            </Typography.Paragraph>
            <Button icon={<FileExcelOutlined />} onClick={generateSampleExcel} style={{ marginTop: 8 }}>
              Tải file mẫu
            </Button>
          </div>

          <Form
            form={importForm}
            layout="vertical"
            onFinish={async (values) => {
              const file = values.file?.[0]?.originFileObj
              if (!file) {
                message.error('Vui lòng chọn file Excel/CSV')
                return
              }

              try {
                // Kiểm tra availableSubjects
                if (!availableSubjects || availableSubjects.length === 0) {
                  const errorMsg = assignmentsQuery.isError 
                    ? 'Không thể tải danh sách phân công môn học. Vui lòng thử lại sau.'
                    : 'Bạn chưa được phân công môn học nào. Vui lòng liên hệ quản trị viên để được phân công môn học trước khi import câu hỏi.'
                  message.error(errorMsg)
                  console.error('No subjects available for teacher:', {
                    assignmentsError: assignmentsQuery.error,
                    assignmentsData: assignmentsQuery.data,
                    allSubjects: subjectsQuery.data?.length || 0,
                    teacherSubjectIds: Array.from(teacherSubjectIds),
                  })
                  return
                }

                // Tạo map cho subjects và chapters (chỉ các môn mà giáo viên phụ trách)
                const subjects = availableSubjects
                const subjectMap = new Map<string, number>()

                // Map exact name (case-insensitive)
                subjects.forEach((s) => {
                  const normalizedName = s.name.toLowerCase().trim()
                  subjectMap.set(normalizedName, s.id)
                })

                // Also map partial matches (e.g., "Vật lý" matches "Vật lý 10")
                subjects.forEach((s) => {
                  const nameParts = s.name.toLowerCase().trim().split(/\s+/)
                  if (nameParts.length > 1) {
                    // Map first two parts (e.g., "Vật lý" from "Vật lý 10")
                    const firstTwoParts = nameParts.slice(0, 2).join(' ')
                    if (!subjectMap.has(firstTwoParts)) {
                      subjectMap.set(firstTwoParts, s.id)
                    }
                  }
                })

                // Log available subjects for debugging
                console.log('Available subjects:', subjects.map(s => s.name))
                console.log('Subject map keys:', Array.from(subjectMap.keys()))
                
                if (subjects.length === 0) {
                  message.error('Không có môn học nào để import. Vui lòng kiểm tra lại phân công môn học.')
                  return
                }

                // Fetch tất cả chapters để tạo map
                const allChapters: Array<{ subjectName: string; chapterName: string; chapterId: number }> = []
                await Promise.all(
                  subjects.map(async (subject) => {
                    try {
                      const chapters = await getChapters(subject.id)
                      chapters.forEach((ch) => {
                        allChapters.push({
                          subjectName: subject.name,
                          chapterName: ch.name,
                          chapterId: ch.id,
                        })
                      })
                    } catch (error) {
                      console.error(`Error fetching chapters for subject ${subject.id}:`, error)
                    }
                  })
                )

                const chapterMap = new Map<string, number>()
                // Map chapters with normalized names (case-insensitive)
                allChapters.forEach((ch) => {
                  const normalizedSubjectName = ch.subjectName.toLowerCase().trim()
                  const normalizedChapterName = ch.chapterName.toLowerCase().trim()

                  // Map: subjectName_chapterName (exact)
                  chapterMap.set(`${normalizedSubjectName}_${normalizedChapterName}`, ch.chapterId)

                  // Map: chapterName only (fallback)
                  if (!chapterMap.has(normalizedChapterName)) {
                    chapterMap.set(normalizedChapterName, ch.chapterId)
                  }

                  // Map: partial chapter name (e.g., "Cơ học" from "Chương 1: Cơ học")
                  const chapterNameParts = normalizedChapterName.split(/[:\-]/)
                  chapterNameParts.forEach(part => {
                    const trimmedPart = part.trim()
                    // Skip "Chương X" parts and short parts
                    if (trimmedPart.length > 2 && !/^chương\s*\d+$/i.test(trimmedPart)) {
                      if (!chapterMap.has(trimmedPart)) {
                        chapterMap.set(trimmedPart, ch.chapterId)
                      }
                      if (!chapterMap.has(`${normalizedSubjectName}_${trimmedPart}`)) {
                        chapterMap.set(`${normalizedSubjectName}_${trimmedPart}`, ch.chapterId)
                      }
                    }
                  })

                  // Also map meaningful words (remove "Chương", numbers, keep main content)
                  const meaningfulWords = normalizedChapterName
                    .split(/\s+/)
                    .filter(word => word.length > 2 && !/^\d+$/.test(word) && word !== 'chương')
                  if (meaningfulWords.length > 0) {
                    const meaningfulName = meaningfulWords.join(' ')
                    if (!chapterMap.has(meaningfulName)) {
                      chapterMap.set(meaningfulName, ch.chapterId)
                    }
                    if (!chapterMap.has(`${normalizedSubjectName}_${meaningfulName}`)) {
                      chapterMap.set(`${normalizedSubjectName}_${meaningfulName}`, ch.chapterId)
                    }
                  }
                })

                console.log('Available chapters:', allChapters.map(ch => `${ch.subjectName} > ${ch.chapterName}`))
                console.log('Chapter map keys (first 30):', Array.from(chapterMap.keys()).slice(0, 30))
                
                if (allChapters.length === 0) {
                  message.error('Không tìm thấy chương nào trong các môn học được phân công. Vui lòng tạo chương trước khi import câu hỏi.')
                  return
                }

                // Fetch tất cả passages để tạo map
                const { getPassages } = await import('../../api/questionApi')
                const allPassages: Array<{ passageId: number; chapterId: number; content: string }> = []
                await Promise.all(
                  allChapters.map(async (ch) => {
                    try {
                      const passages = await getPassages(ch.chapterId)
                      passages.forEach((p) => {
                        allPassages.push({
                          passageId: p.id,
                          chapterId: ch.chapterId,
                          content: p.content,
                        })
                      })
                    } catch (error) {
                      console.error(`Error fetching passages for chapter ${ch.chapterId}:`, error)
                    }
                  })
                )

                // Tạo passageMap: ID -> passageId, và content (first 50 chars) -> passageId
                const passageMap = new Map<string, number>()
                allPassages.forEach((p) => {
                  // Map by ID
                  passageMap.set(String(p.passageId), p.passageId)
                  // Map by content (first 50 chars, lowercase)
                  const contentKey = p.content.substring(0, 50).toLowerCase().trim()
                  if (contentKey) {
                    passageMap.set(contentKey, p.passageId)
                  }
                })

                console.log('Available passages:', allPassages.length)
                console.log('Passage map keys (first 20):', Array.from(passageMap.keys()).slice(0, 20))

                // Log để debug
                console.log('=== IMPORT DEBUG INFO ===')
                console.log('Subjects count:', subjects.length)
                console.log('Chapters count:', allChapters.length)
                console.log('Subject map size:', subjectMap.size)
                console.log('Chapter map size:', chapterMap.size)
                console.log('Sample subject names from map:', Array.from(subjectMap.keys()).slice(0, 5))
                console.log('Sample chapter names from map:', Array.from(chapterMap.keys()).slice(0, 10))

                // Parse file
                const result = await parseExcelFile(
                  file,
                  subjectMap,
                  chapterMap,
                  allChapters.map((ch) => ({ subjectName: ch.subjectName, chapterName: ch.chapterName })),
                  passageMap
                )
                
                console.log('=== PARSE RESULT ===')
                console.log('Questions parsed:', result.questions.length)
                console.log('Errors count:', result.errors.length)
                if (result.errors.length > 0) {
                  console.log('First 5 errors:', result.errors.slice(0, 5))
                }

                // Log chi tiết để debug
                console.log('Parse result:', {
                  totalQuestions: result.questions.length,
                  totalErrors: result.errors.length,
                  firstErrors: result.errors.slice(0, 5),
                })

                if (result.errors.length > 0) {
                  // Hiển thị thông báo chi tiết hơn
                  const errorSummary = result.errors.slice(0, 10).map(err => `Dòng ${err.row}: ${err.error}`).join('\n')
                  console.error('Import errors (first 10):', errorSummary)
                  
                  message.warning(
                    `Import thành công ${result.questions.length} câu hỏi. Có ${result.errors.length} lỗi. Vui lòng kiểm tra lại file.`,
                    10
                  )
                  
                  // Hiển thị lỗi chi tiết trong console và modal
                  if (result.errors.length <= 10) {
                    result.errors.forEach((err) => {
                      console.error(`Row ${err.row}: ${err.error}`)
                      message.error(`Dòng ${err.row}: ${err.error}`, 8)
                    })
                  } else {
                    // Nếu có nhiều lỗi, chỉ hiển thị 5 lỗi đầu
                    result.errors.slice(0, 5).forEach((err) => {
                      console.error(`Row ${err.row}: ${err.error}`)
                      message.error(`Dòng ${err.row}: ${err.error}`, 8)
                    })
                    message.warning(`Và ${result.errors.length - 5} lỗi khác. Vui lòng mở Console (F12) để xem chi tiết.`, 10)
                  }
                }

                if (result.questions.length === 0) {
                  message.error('Không có câu hỏi nào được import. Vui lòng kiểm tra lại file.')
                  return
                }

                // Gửi lên backend
                bulkImportMutation.mutate(result.questions)
              } catch (error) {
                message.error(`Lỗi khi parse file: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            }}
          >
            <Form.Item
              name="file"
              label="Chọn file Excel/CSV"
              rules={[
                {
                  required: true,
                  validator: (_, value) => {
                    if (!value || !value[0] || !value[0].originFileObj) {
                      return Promise.reject(new Error('Vui lòng chọn file Excel/CSV'))
                    }
                    return Promise.resolve()
                  },
                },
              ]}
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e
                }
                return e?.fileList
              }}
            >
              <Upload
                accept=".xlsx,.xls,.csv"
                maxCount={1}
                beforeUpload={() => false} // Prevent auto upload
              >
                <Button icon={<UploadOutlined />}>Chọn file</Button>
              </Upload>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={bulkImportMutation.isPending}
                >
                  Import câu hỏi
                </Button>
                <Button onClick={() => setImportModalOpen(false)}>Hủy</Button>
              </Space>
            </Form.Item>
          </Form>
        </Space>
      </Modal>

      {/* Modal hiển thị câu hỏi trùng */}
      <Modal
        title="Thông tin import câu hỏi"
        open={duplicatesModalOpen}
        onCancel={() => setDuplicatesModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDuplicatesModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={800}
      >
        {importResult && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Typography.Text strong>
                Tổng số câu hỏi đã xử lý: {importResult.totalProcessed}
              </Typography.Text>
              <br />
              <Typography.Text type="success" strong>
                Đã tạo thành công: {importResult.created} câu hỏi
              </Typography.Text>
              <br />
              <Typography.Text type="warning" strong>
                Bị bỏ qua do trùng lặp: {importResult.totalDuplicates} câu hỏi
              </Typography.Text>
            </div>

            {importResult.duplicates.length > 0 && (
              <div>
                <Typography.Text strong>Danh sách câu hỏi bị bỏ qua:</Typography.Text>
                <Table
                  dataSource={importResult.duplicates}
                  rowKey={(record, index) => `${record.chapterId}-${record.content}-${index}`}
                  pagination={{ pageSize: 10 }}
                  size="small"
                  columns={[
                    {
                      title: 'Nội dung câu hỏi',
                      dataIndex: 'content',
                      key: 'content',
                      ellipsis: true,
                      render: (text: string) => (
                        <Typography.Text style={{ maxWidth: 400 }} ellipsis={{ tooltip: text }}>
                          {text}
                        </Typography.Text>
                      ),
                    },
                    {
                      title: 'Lý do',
                      dataIndex: 'reason',
                      key: 'reason',
                      width: 150,
                      render: (reason: string) => (
                        <Tag color={reason === 'TRONG_FILE' ? 'orange' : 'red'}>
                          {reason === 'TRONG_FILE' ? 'Trùng trong file' : 'Đã tồn tại'}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </div>
            )}
          </Space>
        )}
      </Modal>
    </Space>
  )
}

export default QuestionBankPage



