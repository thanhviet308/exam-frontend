import { useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
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
  createQuestion,
  deleteQuestion,
  fetchQuestions,
  updateQuestion,
} from '../../api/teacher/questionsApi'
import type { QuestionFilter, QuestionPayload } from '../../api/teacher/questionsApi'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { getSubjects, getChapters } from '../../api/adminApi'
import type { SubjectResponse, ChapterResponse, CreateQuestionRequest } from '../../types/models'
import { parseExcelFile, generateSampleExcel } from '../../utils/excelParser'

const QuestionBankPage = () => {
  const [filters, setFilters] = useState<QuestionFilter>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [editing, setEditing] = useState<TeacherQuestion | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [form] = Form.useForm()
  const [importForm] = Form.useForm()
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
    onError: (error: Error) => {
      message.error(error.message || 'Không thể xóa câu hỏi. Vui lòng thử lại.')
    },
  })

  const bulkImportMutation = useMutation({
    mutationFn: async (requests: CreateQuestionRequest[]) => {
      const { bulkCreateQuestions: bulkCreateQuestionsApi } = await import('../../api/questionApi')
      return await bulkCreateQuestionsApi(requests)
    },
    onSuccess: (data) => {
      message.success(`Đã import thành công ${data.length} câu hỏi`)
      queryClient.invalidateQueries({ queryKey: ['teacher-questions'] })
      setImportModalOpen(false)
      importForm.resetFields()
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể import câu hỏi. Vui lòng thử lại.')
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
      render: (level: number) => <Tag color="purple">{level}/5</Tag>,
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
          <Button
            type="link"
            danger
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(record.id)}
          >
            Xoá
          </Button>
        </Space>
      ),
    },
  ]

  const handleEdit = (question: TeacherQuestion) => {
    setEditing(question)
    setSelectedSubjectId(question.subjectId)
    setModalOpen(true)
    form.setFieldsValue({
      subjectId: question.subjectId,
      chapterId: question.chapterId,
      questionType: question.questionType,
      content: question.content,
      difficulty: question.difficulty,
      marks: question.marks,
      options: question.options?.map((option) => ({
        content: option.content,
        isCorrect: option.isCorrect,
      })),
      answers: question.answers ?? [''],
    })
  }

  const handleAdd = () => {
    setSelectedSubjectId(undefined)
    form.resetFields()
    form.setFieldsValue({
      questionType: 'MCQ',
      difficulty: 3,
      marks: 1,
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
      marks: values.marks,
      passageId: values.passageId,
      options: values.questionType === 'MCQ' ? values.options : undefined,
      answers: values.questionType === 'FILL' ? values.answers : undefined,
    }
    createOrUpdateMutation.mutate(payload)
  }

  if (questionQuery.isLoading) {
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
              {subjectsQuery.data?.map((subject) => (
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
              style={{ width: 120 }}
              value={filters.difficulty}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, difficulty: value }))
              }}
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <Select.Option key={level} value={level}>
                  {level}
                </Select.Option>
              ))}
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
                form.setFieldsValue({ chapterId: undefined })
              }}
            >
              {subjectsQuery.data?.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="chapterId" label="Chương" rules={[{ required: true }]}>
            <Select placeholder="Chọn chương" disabled={!selectedSubjectId}>
              {formChaptersQuery.data?.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  {chapter.name}
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
              {[1, 2, 3, 4, 5].map((level) => (
                <Select.Option key={level} value={level}>
                  {level}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="marks" label="Điểm" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} style={{ width: '100%' }} />
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
              • <strong>Môn học, Chương, Nội dung, Loại câu hỏi</strong> (MCQ/FILL), <strong>Độ khó</strong> (1-5), <strong>Điểm</strong>
              <br />
              • Với <strong>MCQ</strong>: Phương án 1-4, Đáp án đúng (A/B/C/D hoặc 1/2/3/4)
              <br />
              • Với <strong>FILL</strong>: Đáp án 1, Đáp án 2, ...
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
                // Tạo map cho subjects và chapters
                const subjects = subjectsQuery.data || []
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

                // Parse file
                const result = await parseExcelFile(file, subjectMap, chapterMap, allChapters.map(ch => ({ subjectName: ch.subjectName, chapterName: ch.chapterName })))

                if (result.errors.length > 0) {
                  message.warning(
                    `Import thành công ${result.questions.length} câu hỏi. Có ${result.errors.length} lỗi. Vui lòng kiểm tra lại file.`
                  )
                  console.error('Import errors:', result.errors)
                  // Hiển thị lỗi chi tiết nếu cần
                  if (result.errors.length <= 10) {
                    result.errors.forEach((err) => {
                      message.error(`Dòng ${err.row}: ${err.error}`, 5)
                    })
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
    </Space>
  )
}

export default QuestionBankPage

