import * as XLSX from 'xlsx'
import type { CreateQuestionRequest } from '../types/models'

export interface ExcelQuestionRow {
  [key: string]: string | number | undefined
  // Các cột trong Excel
  'Môn học'?: string
  'Chương'?: string
  'Nội dung'?: string
  'Loại câu hỏi'?: string // MCQ hoặc FILL
  'Độ khó'?: string | number // 1-5 hoặc EASY/MEDIUM/HARD
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

        rows.forEach((row, index) => {
          try {
            const rowNum = index + 2 // +2 vì index bắt đầu từ 0 và có header row

            // Lấy các giá trị từ row
            const subjectName = row['Môn học']?.toString().trim()
            const chapterName = row['Chương']?.toString().trim()
            const content = row['Nội dung']?.toString().trim()
            const questionType = row['Loại câu hỏi']?.toString().trim().toUpperCase()
            const difficulty = row['Độ khó']
            const marks = row['Điểm'] ? Number(row['Điểm']) : 1

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
              errors.push({ 
                row: rowNum, 
                error: `Không tìm thấy môn học: "${subjectName}". Vui lòng kiểm tra lại tên môn học trong file.` 
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
              errors.push({ 
                row: rowNum, 
                error: `Không tìm thấy chương: "${chapterName}" trong môn "${subjectName}".${availableChaptersMsg} Vui lòng sửa tên chương trong file Excel để khớp với tên chương trong database.` 
              })
              return
            }

            // Parse question type
            const qType = questionType === 'MCQ' || questionType === 'TRẮC NGHIỆM' ? 'MCQ' : 'FILL'

            // Parse difficulty
            let difficultyStr: string | undefined
            if (difficulty) {
              if (typeof difficulty === 'number') {
                if (difficulty >= 1 && difficulty <= 2) difficultyStr = 'EASY'
                else if (difficulty >= 3 && difficulty <= 4) difficultyStr = 'MEDIUM'
                else if (difficulty === 5) difficultyStr = 'HARD'
              } else {
                const diffUpper = difficulty.toString().toUpperCase()
                if (['EASY', 'DỄ'].includes(diffUpper)) difficultyStr = 'EASY'
                else if (['MEDIUM', 'TRUNG BÌNH'].includes(diffUpper)) difficultyStr = 'MEDIUM'
                else if (['HARD', 'KHÓ'].includes(diffUpper)) difficultyStr = 'HARD'
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
                content,
                questionType: 'MCQ',
                difficulty: difficultyStr,
                marks,
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
                content,
                questionType: 'FILL',
                difficulty: difficultyStr,
                marks,
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
      'Nội dung': 'Vận tốc của một vật được tính bằng công thức nào?',
      'Loại câu hỏi': 'MCQ',
      'Độ khó': 2,
      'Điểm': 1,
      'Phương án 1': 'v = s/t',
      'Phương án 2': 'v = s*t',
      'Phương án 3': 'v = t/s',
      'Phương án 4': 'v = s²',
      'Đáp án đúng': 'A',
    },
    {
      'Môn học': 'Vật lý',
      'Chương': 'Chương 1: Cơ học',
      'Nội dung': 'Điền vào chỗ trống: Lực được ký hiệu bằng chữ cái ____',
      'Loại câu hỏi': 'FILL',
      'Độ khó': 1,
      'Điểm': 1,
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

