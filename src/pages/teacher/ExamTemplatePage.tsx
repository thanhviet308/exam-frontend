import { useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemplate,
  fetchTemplates,
  updateTemplate,
} from '../../api/teacher/examTemplateApi'
import type { TemplatePayload, TemplateStructureUpdate } from '../../api/teacher/examTemplateApi'
import type { TeacherTemplate } from '../../types'
import { ErrorState, PageSpinner } from '../../components/Loaders'
import { getSubjects, getChapters, getMySubjectAssignments } from '../../api/adminApi'
import { useAuthContext } from '../../context/AuthContext'
import type { SubjectResponse, ChapterResponse, SubjectAssignment } from '../../types/models'

const ExamTemplatePage = () => {
  const { user } = useAuthContext()
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [structureDrawer, setStructureDrawer] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TeacherTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<TeacherTemplate | null>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>(undefined)
  const [structureForm] = Form.useForm()
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [totalSelectedQuestions, setTotalSelectedQuestions] = useState(0)
  const queryClient = useQueryClient()

  const templateQuery = useQuery<TeacherTemplate[]>({
    queryKey: ['teacher-templates'],
    queryFn: fetchTemplates,
    refetchOnWindowFocus: false,
    retry: 2, // Retry 2 times on failure
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const chaptersQuery = useQuery<ChapterResponse[]>({
    queryKey: ['chapters', selectedSubjectId],
    queryFn: () => (selectedSubjectId ? getChapters(selectedSubjectId) : Promise.resolve([])),
    enabled: !!selectedSubjectId,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: true, // Refetch when window gains focus
  })

  // Calculate unique subjects that teacher is responsible for (based on assignments)
  const assignments = assignmentsQuery.data || []
  const teacherSubjectIds = new Set<number>()
  assignments.forEach((a) => {
    if (a.subjectId) teacherSubjectIds.add(a.subjectId)
  })

  // Filter subjects to only show those the teacher is responsible for
  const availableSubjects = (subjectsQuery.data || []).filter((subject) => teacherSubjectIds.has(subject.id))

  const createMutation = useMutation({
    mutationFn: (payload: TemplatePayload) => createTemplate(payload),
    onSuccess: () => {
      message.success('Đã tạo khung đề')
      queryClient.invalidateQueries({ queryKey: ['teacher-templates'] })
      createForm.resetFields()
      setCreateModal(false)
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể tạo khung đề. Vui lòng thử lại.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ templateId, payload }: { templateId: number; payload: TemplatePayload }) =>
      updateTemplate(templateId, payload),
    onSuccess: () => {
      message.success('Đã cập nhật khung đề')
      queryClient.invalidateQueries({ queryKey: ['teacher-templates'] })
      editForm.resetFields()
      setEditModal(false)
      setEditingTemplate(null)
    },
    onError: (error: Error) => {
      message.error(error.message || 'Không thể cập nhật khung đề. Vui lòng thử lại.')
    },
  })

  const structureMutation = useMutation({
    mutationFn: async (payload: { templateId: number; structure: TemplateStructureUpdate; totalQuestions?: number }) => {
      if (!selectedTemplate) {
        throw new Error('Không tìm thấy template để cập nhật')
      }

      // Get subject info
      const subject = availableSubjects.find((s) => s.id === selectedTemplate.subjectId)
      if (!subject) {
        throw new Error('Không tìm thấy thông tin môn học')
      }

      // Use provided totalQuestions or calculate from structure
      const totalQuestions = payload.totalQuestions ??
        payload.structure.reduce((sum, chapter) => sum + (chapter.numQuestion || 0), 0)

      const templatePayload: TemplatePayload = {
        subjectId: selectedTemplate.subjectId,
        subjectName: subject.name,
        name: selectedTemplate.name,
        totalQuestions: totalQuestions,
      }

      // Update template with new structure
      return await updateTemplate(payload.templateId, templatePayload, payload.structure)
    },
    onSuccess: () => {
      message.success('Đã cập nhật cấu trúc đề')
      queryClient.invalidateQueries({ queryKey: ['teacher-templates'] })
      setStructureDrawer(false)
      setSelectedTemplate(null)
    },
    onError: (error: any) => {
      // Parse error message from backend
      let errorMessage = 'Không thể cập nhật cấu trúc đề. Vui lòng thử lại.'

      if (error?.response?.data?.message) {
        // Backend returns: "Not enough questions in chapter {chapterName}"
        const backendMessage = error.response.data.message
        if (backendMessage.includes('Not enough questions')) {
          // Extract chapter name from message
          const chapterMatch = backendMessage.match(/chapter (.+)$/i)
          if (chapterMatch) {
            errorMessage = `Chương "${chapterMatch[1]}" không có đủ câu hỏi. Vui lòng kiểm tra lại số câu hỏi trong ngân hàng câu hỏi.`
          } else {
            errorMessage = backendMessage
          }
        } else if (backendMessage.includes('Sum of chapter questions')) {
          errorMessage = 'Tổng số câu hỏi của các chương phải bằng tổng số câu của đề thi.'
        } else {
          errorMessage = backendMessage
        }
      } else if (error?.message) {
        errorMessage = error.message
      }

      message.error(errorMessage, 5)
    },
  })

  const columns: ColumnsType<TeacherTemplate> = [
    { title: 'Tên đề', dataIndex: 'name' },
    { title: 'Môn học', dataIndex: 'subjectName' },
    { title: 'Số câu', dataIndex: 'totalQuestions' },
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
          <Button type="link" onClick={() => openStructureDrawer(record)}>
            Cấu trúc chương
          </Button>
        </Space>
      ),
    },
  ]

  // Function to calculate total selected questions
  const calculateTotalQuestions = () => {
    const formValues = structureForm.getFieldsValue()
    const chapters = formValues.chapters || []
    const total = chapters
      .filter((ch: any) => ch.availableQuestions > 0)
      .reduce((sum: number, ch: any) => {
        const basic = Number(ch.numBasic) || 0
        const advanced = Number(ch.numAdvanced) || 0
        return sum + basic + advanced
      }, 0)
    setTotalSelectedQuestions(total)
  }

  const openStructureDrawer = async (template: TeacherTemplate) => {
    setSelectedTemplate(template)
    setSelectedSubjectId(template.subjectId)

    // Reset form first to avoid duplicates
    structureForm.resetFields()

    // Fetch chapters for this subject
    const chapters = await getChapters(template.subjectId)

    // Fetch question counts for each chapter (separate by difficulty)
    const { fetchQuestions } = await import('../../api/teacher/questionsApi')
    const chapterQuestionCounts = new Map<number, number>()
    const chapterBasicCounts = new Map<number, number>()
    const chapterAdvancedCounts = new Map<number, number>()

    await Promise.all(
      chapters.map(async (chapter) => {
        try {
          const questions = await fetchQuestions({ chapterId: chapter.id })
          const total = questions.length
          const basic = questions.filter(q => q.difficulty === 'BASIC').length
          const advanced = questions.filter(q => q.difficulty === 'ADVANCED').length
          
          chapterQuestionCounts.set(chapter.id, total)
          chapterBasicCounts.set(chapter.id, basic)
          chapterAdvancedCounts.set(chapter.id, advanced)
        } catch (error) {
          console.error(`Error fetching questions for chapter ${chapter.id}:`, error)
          chapterQuestionCounts.set(chapter.id, 0)
          chapterBasicCounts.set(chapter.id, 0)
          chapterAdvancedCounts.set(chapter.id, 0)
        }
      })
    )

    // Set form fields with chapters data - ensure no duplicates by using unique chapter IDs
    const uniqueChapters = chapters.filter((chapter, index, self) =>
      index === self.findIndex((c) => c.id === chapter.id)
    )

    structureForm.setFieldsValue({
      chapters: uniqueChapters.map((chapter) => {
        const existingStructure = template.structure.find((item) => item.chapterId === chapter.id)
        return {
          chapterId: chapter.id,
          chapterName: chapter.name,
          numQuestion: existingStructure?.numQuestion ?? 0,
          numBasic: existingStructure?.numBasic ?? 0,
          numAdvanced: existingStructure?.numAdvanced ?? 0,
          availableQuestions: chapterQuestionCounts.get(chapter.id) ?? 0,
          availableBasic: chapterBasicCounts.get(chapter.id) ?? 0,
          availableAdvanced: chapterAdvancedCounts.get(chapter.id) ?? 0,
        }
      }),
    })

    // Calculate initial total
    const initialTotal = uniqueChapters.reduce((sum, chapter) => {
      const existingStructure = template.structure.find((item) => item.chapterId === chapter.id)
      const numBasic = existingStructure?.numBasic ?? 0
      const numAdvanced = existingStructure?.numAdvanced ?? 0
      return sum + numBasic + numAdvanced
    }, 0)
    setTotalSelectedQuestions(initialTotal)

    setStructureDrawer(true)
  }

  const handleStructureSave = async (values: { chapters: TemplateStructureUpdate }) => {
    if (!selectedTemplate) return

    // Get all form values including availableQuestions
    const allFormValues = structureForm.getFieldsValue()
    const allChapters = allFormValues.chapters || []

    // Map chapters with their available questions count
    const chaptersWithAvailability = values.chapters.map((chapter) => {
      const formChapter = allChapters.find((c: any) => c.chapterId === chapter.chapterId)
      const availableQuestions = formChapter?.availableQuestions ?? 0
      return { ...chapter, availableQuestions }
    })

    // Filter out chapters with 0 available questions or 0 total questions
    const validChapters = chaptersWithAvailability
      .filter((chapter) => {
        // Skip chapters with no available questions
        if (chapter.availableQuestions === 0) return false
        // Calculate total from numBasic + numAdvanced (don't rely on numQuestion from form)
        const numBasic = Number(chapter.numBasic) || 0
        const numAdvanced = Number(chapter.numAdvanced) || 0
        const total = numBasic + numAdvanced
        // Skip chapters with 0 total questions
        return total > 0
      })
      .map((chapter) => {
        const numBasic = Number(chapter.numBasic) || 0
        const numAdvanced = Number(chapter.numAdvanced) || 0
        const numQuestion = numBasic + numAdvanced
        return {
          chapterId: chapter.chapterId,
          chapterName: chapter.chapterName,
          numQuestion,
          numBasic,
          numAdvanced,
        }
      })

    // Calculate total questions from valid structure only
    const totalQuestions = validChapters.reduce((sum, chapter) => sum + chapter.numQuestion, 0)

    if (totalQuestions === 0) {
      message.error('Vui lòng nhập ít nhất 1 câu hỏi cho một chương')
      return
    }

    // Validate: Total questions from chapters must match template's totalQuestions
    if (totalQuestions !== selectedTemplate.totalQuestions) {
      message.error(
        `Tổng số câu của các chương (${totalQuestions}) không khớp với tổng số câu của khung đề (${selectedTemplate.totalQuestions}). Vui lòng điều chỉnh lại.`,
        5
      )
      return
    }

    // Validate: Check if each chapter has enough questions available
    try {
      const { fetchQuestions } = await import('../../api/teacher/questionsApi')
      const errors: string[] = []

      for (const chapter of validChapters) {
        const questions = await fetchQuestions({ chapterId: chapter.chapterId })
        const availableCount = questions.length

        if (availableCount < chapter.numQuestion) {
          errors.push(
            `Chương "${chapter.chapterName}" chỉ có ${availableCount} câu hỏi, nhưng bạn đã nhập ${chapter.numQuestion} câu.`
          )
        }
      }

      if (errors.length > 0) {
        // Show detailed error messages
        errors.forEach((error) => {
          message.error(error, 5) // Show for 5 seconds
        })
        return
      }
    } catch (error) {
      console.error('Error validating questions:', error)
      // Continue anyway, backend will validate
    }

    // Update template with new structure and recalculated totalQuestions
    const updatedTemplate = {
      ...selectedTemplate,
      totalQuestions,
    }
    setSelectedTemplate(updatedTemplate)

    structureMutation.mutate({
      templateId: selectedTemplate.id,
      structure: validChapters,
      totalQuestions
    })
  }

  const handleCreate = (values: any) => {
    const subject = availableSubjects.find((s) => s.id === values.subjectId)
    const payload: TemplatePayload = {
      subjectId: values.subjectId,
      subjectName: subject?.name ?? '',
      name: values.name,
      totalQuestions: values.totalQuestions,
    }
    createMutation.mutate(payload)
  }

  const handleEdit = (template: TeacherTemplate) => {
    setEditingTemplate(template)
    setSelectedSubjectId(template.subjectId)
    // Reset form trước khi set giá trị mới
    editForm.resetFields()
    // Set giá trị sau khi reset
    setTimeout(() => {
      editForm.setFieldsValue({
        name: template.name,
        totalQuestions: template.totalQuestions,
      })
    }, 0)
    setEditModal(true)
  }

  const handleUpdate = (values: any) => {
    if (!editingTemplate) return
    const subject = availableSubjects.find((s) => s.id === editingTemplate.subjectId)
    const payload: TemplatePayload = {
      subjectId: editingTemplate.subjectId,
      subjectName: subject?.name ?? '',
      name: values.name,
      totalQuestions: values.totalQuestions,
    }
    updateMutation.mutate({ templateId: editingTemplate.id, payload })
  }

  if (templateQuery.isLoading || subjectsQuery.isLoading || assignmentsQuery.isLoading) {
    return <PageSpinner />
  }

  if (templateQuery.error || subjectsQuery.error || assignmentsQuery.error) {
    const error = (templateQuery.error || subjectsQuery.error || assignmentsQuery.error) as Error
    return (
      <ErrorState
        message={error.message || 'Không thể tải danh sách khung đề. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.'}
        onRetry={() => {
          templateQuery.refetch()
          subjectsQuery.refetch()
          assignmentsQuery.refetch()
        }}
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3}>Khung đề</Typography.Title>
      <Button type="primary" onClick={() => setCreateModal(true)}>
        Tạo khung đề
      </Button>
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={templateQuery.data || []}
          loading={templateQuery.isFetching}
        />
      </Card>

      <Modal
        open={createModal}
        title="Tạo khung đề mới"
        onCancel={() => setCreateModal(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form layout="vertical" form={createForm} onFinish={handleCreate}>
          <Form.Item
            name="subjectId"
            label="Môn học"
            rules={[{ required: true }]}
          >
            <Select
              placeholder="Chọn môn học"
              onChange={(value) => setSelectedSubjectId(value)}
            >
              {availableSubjects.map((subject) => (
                <Select.Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="Tên đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="totalQuestions"
            label="Tổng số câu"
            rules={[{ required: true, message: 'Nhập số câu hỏi' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editModal}
        title="Sửa khung đề"
        onCancel={() => {
          setEditModal(false)
          setEditingTemplate(null)
          editForm.resetFields()
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form layout="vertical" form={editForm} onFinish={handleUpdate}>
          <Form.Item label="Môn học">
            <Input value={editingTemplate?.subjectName} disabled />
          </Form.Item>
          <Form.Item 
            name="name" 
            label="Tên đề" 
            rules={[{ required: true, message: 'Nhập tên đề' }]}
          >
            <Input placeholder="Nhập tên đề" />
          </Form.Item>
          <Form.Item
            name="totalQuestions"
            label="Tổng số câu"
            rules={[{ required: true, message: 'Nhập số câu hỏi' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập tổng số câu" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={structureDrawer}
        title={
          <Space>
            <span>Cấu trúc đề - {selectedTemplate?.name ?? ''}</span>
            {totalSelectedQuestions > 0 && (
              <Tag color={totalSelectedQuestions === (selectedTemplate?.totalQuestions || 0) ? 'green' : totalSelectedQuestions > (selectedTemplate?.totalQuestions || 0) ? 'red' : 'orange'}>
                {totalSelectedQuestions} / {selectedTemplate?.totalQuestions || 0} câu
              </Tag>
            )}
          </Space>
        }
        width={480}
        onClose={() => {
          setStructureDrawer(false)
          setTotalSelectedQuestions(0)
        }}
        extra={<Tag color="blue">{selectedTemplate?.subjectName}</Tag>}
      >
        <Typography.Paragraph>
          Phân bổ số câu hỏi cho từng chương thuộc môn học này.
        </Typography.Paragraph>
        <Form layout="vertical" form={structureForm} onFinish={handleStructureSave}>
          <Form.List name="chapters">
            {(fields, { remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.length === 0 && (
                  <div>Đang tải danh sách chương...</div>
                )}
                {fields.map((field) => {
                  const chapterName = structureForm.getFieldValue(['chapters', field.name, 'chapterName'])
                  const availableQuestions = structureForm.getFieldValue(['chapters', field.name, 'availableQuestions']) ?? 0
                  const availableBasic = structureForm.getFieldValue(['chapters', field.name, 'availableBasic']) ?? 0
                  const availableAdvanced = structureForm.getFieldValue(['chapters', field.name, 'availableAdvanced']) ?? 0

                  return (
                    <Space key={field.key} direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                      <Space align="baseline" style={{ width: '100%' }}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'chapterName']}
                          fieldKey={[field.fieldKey!, 'chapterName']}
                          label="Chương"
                          style={{ flex: 1 }}
                        >
                          <Input readOnly />
                        </Form.Item>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'numBasic']}
                            fieldKey={[field.fieldKey!, 'numBasic']}
                            label="Số câu cơ bản"
                            rules={[
                              {
                                required: availableQuestions > 0,
                                message: 'Nhập số câu cơ bản',
                                validator: (_, value) => {
                                  if (availableQuestions === 0) {
                                    return Promise.resolve()
                                  }
                                  const numBasic = Number(value) || 0
                                  const numAdvanced = Number(structureForm.getFieldValue(['chapters', field.name, 'numAdvanced'])) || 0
                                  const total = numBasic + numAdvanced
                                  if (total === 0) {
                                    return Promise.reject(new Error('Nhập số câu cơ bản hoặc nâng cao'))
                                  }
                                  if (numBasic > availableBasic) {
                                    return Promise.reject(
                                      new Error(`Số câu cơ bản (${numBasic}) vượt quá số câu có sẵn (${availableBasic})`)
                                    )
                                  }
                                  if (total > availableQuestions) {
                                    return Promise.reject(
                                      new Error(`Tổng số câu (${total}) vượt quá số câu có sẵn (${availableQuestions})`)
                                    )
                                  }
                                  return Promise.resolve()
                                },
                              },
                            ]}
                          >
                            <InputNumber
                              min={0}
                              max={availableBasic}
                              disabled={availableQuestions === 0}
                              placeholder={availableQuestions === 0 ? 'Chưa có câu hỏi' : `Tối đa ${availableBasic} câu`}
                              onChange={() => {
                                // Auto-update numQuestion when numBasic or numAdvanced changes
                                const numBasic = Number(structureForm.getFieldValue(['chapters', field.name, 'numBasic'])) || 0
                                const numAdvanced = Number(structureForm.getFieldValue(['chapters', field.name, 'numAdvanced'])) || 0
                                structureForm.setFieldValue(['chapters', field.name, 'numQuestion'], numBasic + numAdvanced)
                                // Update total in title
                                setTimeout(() => calculateTotalQuestions(), 0)
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'numAdvanced']}
                            fieldKey={[field.fieldKey!, 'numAdvanced']}
                            label="Số câu nâng cao"
                            rules={[
                              {
                                required: availableQuestions > 0,
                                message: 'Nhập số câu nâng cao',
                                validator: (_, value) => {
                                  if (availableQuestions === 0) {
                                    return Promise.resolve()
                                  }
                                  const numBasic = Number(structureForm.getFieldValue(['chapters', field.name, 'numBasic'])) || 0
                                  const numAdvanced = Number(value) || 0
                                  const total = numBasic + numAdvanced
                                  if (total === 0) {
                                    return Promise.reject(new Error('Nhập số câu cơ bản hoặc nâng cao'))
                                  }
                                  if (numAdvanced > availableAdvanced) {
                                    return Promise.reject(
                                      new Error(`Số câu nâng cao (${numAdvanced}) vượt quá số câu có sẵn (${availableAdvanced})`)
                                    )
                                  }
                                  if (total > availableQuestions) {
                                    return Promise.reject(
                                      new Error(`Tổng số câu (${total}) vượt quá số câu có sẵn (${availableQuestions})`)
                                    )
                                  }
                                  return Promise.resolve()
                                },
                              },
                            ]}
                          >
                            <InputNumber
                              min={0}
                              max={availableAdvanced}
                              disabled={availableQuestions === 0}
                              placeholder={availableQuestions === 0 ? 'Chưa có câu hỏi' : `Tối đa ${availableAdvanced} câu`}
                              onChange={() => {
                                // Auto-update numQuestion when numBasic or numAdvanced changes
                                const numBasic = Number(structureForm.getFieldValue(['chapters', field.name, 'numBasic'])) || 0
                                const numAdvanced = Number(structureForm.getFieldValue(['chapters', field.name, 'numAdvanced'])) || 0
                                structureForm.setFieldValue(['chapters', field.name, 'numQuestion'], numBasic + numAdvanced)
                                // Update total in title
                                setTimeout(() => calculateTotalQuestions(), 0)
                              }}
                            />
                          </Form.Item>
                          <Form.Item
                            {...field}
                            name={[field.name, 'numQuestion']}
                            fieldKey={[field.fieldKey!, 'numQuestion']}
                            label="Tổng số câu"
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber
                              readOnly
                              disabled
                              value={
                                (Number(structureForm.getFieldValue(['chapters', field.name, 'numBasic'])) || 0) +
                                (Number(structureForm.getFieldValue(['chapters', field.name, 'numAdvanced'])) || 0)
                              }
                            />
                          </Form.Item>
                        </Space>
                      </Space>
                      {availableQuestions > 0 && (
                        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 0 }}>
                          Có sẵn: <strong>{availableBasic}</strong> câu cơ bản, <strong>{availableAdvanced}</strong> câu nâng cao (Tổng: {availableQuestions} câu)
                        </Typography.Text>
                      )}
                      {availableQuestions === 0 && (
                        <Typography.Text type="danger" style={{ fontSize: 12, marginLeft: 0 }}>
                          ⚠️ Chương này chưa có câu hỏi nào trong ngân hàng câu hỏi
                        </Typography.Text>
                      )}
                    </Space>
                  )
                })}
              </Space>
            )}
          </Form.List>
          <Form.Item shouldUpdate style={{ marginTop: 16 }}>
            {() => {
              // Calculate total questions from all chapters
              const formValues = structureForm.getFieldsValue()
              const chapters = formValues.chapters || []
              const totalFromChapters = chapters
                .filter((ch: any) => ch.availableQuestions > 0) // Only count chapters with questions
                .reduce((sum: number, ch: any) => {
                  const basic = Number(ch.numBasic) || 0
                  const advanced = Number(ch.numAdvanced) || 0
                  return sum + basic + advanced
                }, 0)

              const templateTotal = selectedTemplate?.totalQuestions || 0
              const isMatch = totalFromChapters === templateTotal
              // Chỉ hiển thị cảnh báo khi vượt quá tổng số câu
              const shouldShowWarning = totalFromChapters > templateTotal

              return (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {shouldShowWarning && (
                    <Alert
                      type="error"
                      message={`Tổng số câu vượt quá giới hạn!`}
                      description={`Bạn đã nhập ${totalFromChapters} câu, vượt quá ${templateTotal} câu của khung đề. Vui lòng giảm số câu để khớp với tổng số câu của khung đề.`}
                      showIcon
                      closable={false}
                    />
                  )}
                  {totalFromChapters === 0 && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      Tổng số câu: 0 / {templateTotal}
                    </Typography.Text>
                  )}
                  {!shouldShowWarning && totalFromChapters > 0 && totalFromChapters < templateTotal && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      Tổng số câu: {totalFromChapters} / {templateTotal}
                    </Typography.Text>
                  )}
                  {isMatch && totalFromChapters > 0 && (
                    <Typography.Text type="success" style={{ fontSize: 13 }}>
                      ✓ Tổng số câu: {totalFromChapters} / {templateTotal} (Đã khớp)
                    </Typography.Text>
                  )}
                  <Button
                    type="primary"
                    onClick={() => structureForm.submit()}
                    loading={structureMutation.isPending}
                    disabled={!isMatch || totalFromChapters === 0}
                  >
                    Lưu cấu trúc
                  </Button>
                </Space>
              )
            }}
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  )
}

export default ExamTemplatePage

