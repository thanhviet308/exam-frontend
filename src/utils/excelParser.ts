import * as XLSX from 'xlsx'
import type { CreateQuestionRequest } from '../types/models'

export interface ExcelQuestionRow {
  [key: string]: string | number | undefined
  // Các cột trong Excel
  'Môn học'?: string
  'Chương'?: string
  'Đoạn văn'?: string // ID hoặc nội dung đoạn văn (tùy chọn)
  'Nội dung'?: string
  'Loại câu hỏi'?: string // MCQ hoặc FILL
  'Độ khó'?: string | number // "Cơ bản"/"BASIC" hoặc "Nâng cao"/"ADVANCED" (hoặc số: 1-3 = Cơ bản, 4-5 = Nâng cao)
  'Điểm'?: number
  'Phương án 1'?: string
  'Phương án 2'?: string
  'Phương án 3'?: string
  'Phương án 4'?: string
  'Đáp án đúng'?: string // A/B/C/D hoặc số thứ tự
  'Đáp án 1'?: string // Cho câu hỏi FILL
  'Đáp án 2'?: string
  'Đáp án 3'?: string
}

export interface ParseResult {
  questions: CreateQuestionRequest[]
  errors: Array<{ row: number; error: string }>
}

/**
 * Parse file Excel/CSV thành danh sách câu hỏi
 */
export function parseExcelFile(
  file: File,
  subjectMap: Map<string, number>, // Map từ subject name -> subjectId
  chapterMap: Map<string, number>, // Map từ chapter name -> chapterId
  availableChapters?: Array<{ subjectName: string; chapterName: string }>, // For better error messages
  passageMap?: Map<string, number>, // Map từ passage content (first 50 chars) hoặc ID -> passageId
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Không thể đọc file'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const rows: ExcelQuestionRow[] = XLSX.utils.sheet_to_json(worksheet)

        const questions: CreateQuestionRequest[] = []
        const errors: Array<{ row: number; error: string }> = []

        // Log để debug
        console.log('Total rows in Excel:', rows.length)
        if (rows.length > 0) {
          console.log('First row keys:', Object.keys(rows[0]))
          console.log('First row sample:', {
            'Môn học': rows[0]['Môn học'],
            'Chương': rows[0]['Chương'],
            'Nội dung': rows[0]['Nội dung']?.toString().substring(0, 50),
          })
        }

        rows.forEach((row, index) => {
          try {
            const rowNum = index + 2 // +2 vì index bắt đầu từ 0 và có header row

            // Lấy các giá trị từ row
            const subjectName = row['Môn học']?.toString().trim()
            const chapterName = row['Chương']?.toString().trim()
            const content = row['Nội dung']?.toString().trim()
            const questionType = row['Loại câu hỏi']?.toString().trim().toUpperCase()
            const difficulty = row['Độ khó']

            // Validate required fields
            if (!subjectName) {
              errors.push({ row: rowNum, error: 'Thiếu tên môn học' })
              return
            }
            if (!chapterName) {
              errors.push({ row: rowNum, error: 'Thiếu tên chương' })
              return
            }
            if (!content) {
              errors.push({ row: rowNum, error: 'Thiếu nội dung câu hỏi' })
              return
            }

            // Tìm subjectId và chapterId (case-insensitive, partial match)
            const subjectNameLower = subjectName.toLowerCase().trim()
            let subjectId = subjectMap.get(subjectNameLower)

            // Try partial matching if exact match fails
            if (!subjectId) {
              // Try matching first two words (e.g., "Vật lý" from "Vật lý 10")
              const nameParts = subjectNameLower.split(' ')
              if (nameParts.length >= 2) {
                const firstTwoParts = nameParts.slice(0, 2).join(' ')
                subjectId = subjectMap.get(firstTwoParts)
              }
            }

            if (!subjectId) {
              // Log để debug
              if (index < 3) {
                console.log(`Row ${rowNum} - Subject not found:`, {
                  subjectName,
                  subjectNameLower,
                  availableKeys: Array.from(subjectMap.keys()).slice(0, 10),
                })
              }
              errors.push({
                row: rowNum,
                error: `Không tìm thấy môn học: "${subjectName}". Các môn có sẵn: ${Array.from(subjectMap.keys()).slice(0, 5).join(', ')}...`
              })
              return
            }

            // Find chapterId (case-insensitive, partial match)
            const chapterNameLower = chapterName.toLowerCase().trim()

            // Try multiple matching strategies
            let chapterId =
              // 1. Try exact match with subject prefix
              chapterMap.get(`${subjectNameLower}_${chapterNameLower}`) ||
              // 2. Try exact match without subject prefix
              chapterMap.get(chapterNameLower)

            // Try partial matching if exact match fails
            if (!chapterId) {
              // 3. Try matching after removing "Chương X:" or "Chương X -" prefix
              const cleanedChapterName = chapterNameLower.replace(/^chương\s*\d+\s*[:\-]?\s*/i, '').trim()
              if (cleanedChapterName) {
                chapterId = chapterMap.get(`${subjectNameLower}_${cleanedChapterName}`) ||
                  chapterMap.get(cleanedChapterName)
              }

              // 4. Try matching parts separated by : or -
              if (!chapterId) {
                const parts = chapterNameLower.split(/[:\-]/)
                for (const part of parts) {
                  const trimmedPart = part.trim()
                  // Skip "Chương X" parts
                  if (trimmedPart.length > 2 && !/^chương\s*\d+$/i.test(trimmedPart)) {
                    chapterId = chapterMap.get(`${subjectNameLower}_${trimmedPart}`) ||
                      chapterMap.get(trimmedPart)
                    if (chapterId) break
                  }
                }
              }

              // 5. Try matching by removing "Chương" and numbers, keep only meaningful parts
              if (!chapterId) {
                const meaningfulParts = chapterNameLower
                  .split(/\s+/)
                  .filter(part => part.length > 2 && !/^\d+$/.test(part) && part !== 'chương')
                if (meaningfulParts.length > 0) {
                  const meaningfulName = meaningfulParts.join(' ')
                  chapterId = chapterMap.get(`${subjectNameLower}_${meaningfulName}`) ||
                    chapterMap.get(meaningfulName)
                }
              }
            }

            if (!chapterId) {
              // Find available chapters for this subject to show in error
              let availableChaptersMsg = ''
              if (availableChapters) {
                const subjectChapters = availableChapters.filter(
                  ch => ch.subjectName.toLowerCase().includes(subjectNameLower) ||
                    subjectNameLower.includes(ch.subjectName.toLowerCase())
                ).map(ch => ch.chapterName)
                if (subjectChapters.length > 0) {
                  availableChaptersMsg = ` Các chương có sẵn: ${subjectChapters.slice(0, 5).join(', ')}${subjectChapters.length > 5 ? '...' : ''}`
                }
              }
              
              // Log để debug
              if (index < 3) {
                console.log(`Row ${rowNum} - Chapter not found:`, {
                  subjectName,
                  chapterName,
                  chapterNameLower,
                  availableKeys: Array.from(chapterMap.keys()).filter(k => k.includes(subjectNameLower)).slice(0, 5),
                })
              }
              
              errors.push({
                row: rowNum,
                error: `Không tìm thấy chương: "${chapterName}" trong môn "${subjectName}".${availableChaptersMsg} Vui lòng sửa tên chương trong file Excel để khớp với tên chương trong database.`
              })
              return
            }

            // Parse passage (optional)
            let passageId: number | undefined = undefined
            const passageValue = row['Đoạn văn']?.toString().trim()
            if (passageValue) {
              // Try to parse as ID first
              const numericId = Number(passageValue)
              if (!isNaN(numericId) && passageMap) {
                passageId = passageMap.get(String(numericId)) || passageMap.get(passageValue.toLowerCase())
              } else if (passageMap) {
                // Try to match by content (first 50 chars)
                const passageKey = passageValue.toLowerCase().substring(0, 50)
                passageId = passageMap.get(passageKey)
              }
              // If not found, just skip (passage is optional)
            }

            // Parse question type (hỗ trợ cả tiếng Việt và tiếng Anh)
            let qType: 'MCQ' | 'FILL'
            const questionTypeUpper = questionType?.toUpperCase() || ''
            if (
              questionTypeUpper === 'MCQ' ||
              questionTypeUpper === 'TRẮC NGHIỆM' ||
              questionTypeUpper === 'TRAC NGHIEM' ||
              questionTypeUpper === 'TRẮC NGHIỆM NHIỀU LỰA CHỌN'
            ) {
              qType = 'MCQ'
            } else {
              qType = 'FILL'
            }

            // Parse difficulty (chỉ có 2 mức: Cơ bản và Nâng cao)
            let difficultyStr: string | undefined = 'BASIC' // Mặc định là cơ bản
            if (difficulty) {
              const diffUpper = difficulty.toString().toUpperCase()
              if (['ADVANCED', 'NÂNG CAO', 'NANG CAO'].includes(diffUpper)) {
                difficultyStr = 'ADVANCED'
              } else if (['BASIC', 'CƠ BẢN', 'CO BAN'].includes(diffUpper)) {
                difficultyStr = 'BASIC'
              }
              // Nếu là số, coi như cơ bản (1-3) hoặc nâng cao (4-5)
              else if (typeof difficulty === 'number') {
                difficultyStr = difficulty >= 4 ? 'ADVANCED' : 'BASIC'
              }
            }

            // Parse options/answers
            if (qType === 'MCQ') {
              const options = []
              const correctAnswer = row['Đáp án đúng']?.toString().trim().toUpperCase()

              // Lấy các phương án
              for (let i = 1; i <= 4; i++) {
                const optionKey = `Phương án ${i}` as keyof ExcelQuestionRow
                const optionContent = row[optionKey]?.toString().trim()
                if (optionContent) {
                  const isCorrect =
                    correctAnswer === String(i) ||
                    correctAnswer === String.fromCharCode(64 + i) || // A, B, C, D
                    (correctAnswer && optionContent.toLowerCase().includes(correctAnswer.toLowerCase()))
                  options.push({
                    content: optionContent,
                    correct: isCorrect || false,
                  })
                }
              }

              if (options.length < 2) {
                errors.push({ row: rowNum, error: 'Câu hỏi MCQ cần ít nhất 2 phương án' })
                return
              }

              const hasCorrect = options.some((opt) => opt.correct)
              if (!hasCorrect && correctAnswer) {
                // Nếu không có phương án nào được đánh dấu đúng, đánh dấu phương án đầu tiên
                options[0].correct = true
              }

              questions.push({
                chapterId,
                passageId,
                content,
                questionType: 'MCQ',
                difficulty: difficultyStr,
                active: true,
                options,
                answers: undefined,
              })
            } else {
              // FILL type
              const answers: Array<{ answer: string }> = []
              for (let i = 1; i <= 10; i++) {
                const answerKey = `Đáp án ${i}` as keyof ExcelQuestionRow
                const answerContent = row[answerKey]?.toString().trim()
                if (answerContent) {
                  answers.push({ answer: answerContent })
                }
              }

              if (answers.length === 0) {
                errors.push({ row: rowNum, error: 'Câu hỏi FILL cần ít nhất 1 đáp án' })
                return
              }

              questions.push({
                chapterId,
                passageId,
                content,
                questionType: 'FILL',
                difficulty: difficultyStr,
                active: true,
                options: undefined,
                answers,
              })
            }
          } catch (error) {
            errors.push({ row: index + 2, error: `Lỗi khi parse dòng: ${error instanceof Error ? error.message : 'Unknown error'}` })
          }
        })

        resolve({ questions, errors })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Lỗi khi đọc file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Tạo file Excel mẫu để download
 */
export function generateSampleExcel(): void {
  const sampleData = [
    {
      'Môn học': 'Vật lý',
      'Chương': 'Chương 1: Cơ học',
      'Đoạn văn': '', // Tùy chọn: ID đoạn văn hoặc để trống
      'Nội dung': 'Vận tốc của một vật được tính bằng công thức nào?',
      'Loại câu hỏi': 'Trắc nghiệm',
      'Độ khó': 'Cơ bản',
      'Phương án 1': 'v = s/t',
      'Phương án 2': 'v = s*t',
      'Phương án 3': 'v = t/s',
      'Phương án 4': 'v = s²',
      'Đáp án đúng': 'A',
    },
    {
      'Môn học': 'Vật lý',
      'Chương': 'Chương 1: Cơ học',
      'Đoạn văn': '1', // Ví dụ: ID đoạn văn hoặc để trống nếu không có
      'Nội dung': 'Dựa vào đoạn văn trên, vận tốc trung bình được tính như thế nào?',
      'Loại câu hỏi': 'Trắc nghiệm',
      'Độ khó': 'Nâng cao',
      'Phương án 1': 'v = s/t',
      'Phương án 2': 'v = s*t',
      'Phương án 3': 'v = t/s',
      'Phương án 4': 'v = s²',
      'Đáp án đúng': 'A',
    },
    {
      'Môn học': 'Vật lý',
      'Chương': 'Chương 1: Cơ học',
      'Đoạn văn': '', // Tùy chọn
      'Nội dung': 'Điền vào chỗ trống: Lực được ký hiệu bằng chữ cái ____',
      'Loại câu hỏi': 'Điền',
      'Độ khó': 'Cơ bản',
      'Đáp án 1': 'F',
      'Đáp án 2': 'f',
      'Đáp án 3': 'F hoặc f',
    },
  ]

  const worksheet = XLSX.utils.json_to_sheet(sampleData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu câu hỏi')
  XLSX.writeFile(workbook, 'mau_cau_hoi.xlsx')
}

