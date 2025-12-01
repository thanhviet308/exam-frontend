import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import type { SupervisorStatistics } from '../api/supervisor/supervisorApi'

const getViolationLabel = (type: string) => {
  const labels: Record<string, string> = {
    TAB_SWITCH: 'Chuyển tab',
    WINDOW_BLUR: 'Rời cửa sổ',
    COPY: 'Sao chép',
    PASTE: 'Dán nội dung',
    RIGHT_CLICK: 'Click phải',
  }
  return labels[type] || type
}

export const exportViolationsToExcel = (
  session: SupervisorStatistics['recentSessions'][0],
  studentViolations: SupervisorStatistics['studentViolations']
) => {
  // Lọc vi phạm của ca thi được chọn
  const sessionViolations = studentViolations.filter(
    (v) => v.examInstanceId === session.examInstanceId
  )

  // Tạo workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Tổng quan ca thi
  const summaryData = [
    ['THÔNG TIN CA THI'],
    ['Tên kỳ thi', session.examName],
    ['Môn học', session.subjectName],
    ['Nhóm sinh viên', session.studentGroupName],
    ['Thời gian bắt đầu', dayjs(session.startTime).format('DD/MM/YYYY HH:mm')],
    ['Thời gian kết thúc', dayjs(session.endTime).format('DD/MM/YYYY HH:mm')],
    ['Tổng số sinh viên', session.totalStudents],
    ['Số sinh viên đã hoàn thành', session.completedStudents],
    ['Tổng số vi phạm', session.violationsCount],
    [],
    ['THỐNG KÊ VI PHẠM THEO LOẠI'],
    ['Loại vi phạm', 'Số lượng'],
  ]

  // Tính tổng vi phạm theo loại
  const violationsByType: Record<string, number> = {}
  sessionViolations.forEach((sv) => {
    Object.entries(sv.violationsByType || {}).forEach(([type, count]) => {
      violationsByType[type] = (violationsByType[type] || 0) + (count as number)
    })
  })

  Object.entries(violationsByType).forEach(([type, count]) => {
    summaryData.push([getViolationLabel(type), count])
  })

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Tổng quan')

  // Sheet 2: Chi tiết vi phạm theo học sinh
  const detailData = [
    [
      'STT',
      'Họ và tên',
      'Kỳ thi',
      'Môn học',
      'Nhóm',
      'Tổng vi phạm',
      'Chuyển tab',
      'Rời cửa sổ',
      'Sao chép',
      'Dán nội dung',
      'Click phải',
      'Lần vi phạm cuối',
    ],
  ]

  sessionViolations.forEach((item, index) => {
    const violations = item.violationsByType || {}
    detailData.push([
      index + 1,
      item.studentName,
      item.examName,
      item.subjectName,
      item.studentGroupName,
      item.totalViolations,
      violations.TAB_SWITCH || 0,
      violations.WINDOW_BLUR || 0,
      violations.COPY || 0,
      violations.PASTE || 0,
      violations.RIGHT_CLICK || 0,
      item.lastViolationTime
        ? dayjs(item.lastViolationTime).format('DD/MM/YYYY HH:mm:ss')
        : 'Chưa có',
    ])
  })

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData)
  
  // Đặt độ rộng cột
  const colWidths = [
    { wch: 5 },  // STT
    { wch: 25 }, // Họ và tên
    { wch: 30 }, // Kỳ thi
    { wch: 20 }, // Môn học
    { wch: 15 }, // Nhóm
    { wch: 12 }, // Tổng vi phạm
    { wch: 12 }, // Chuyển tab
    { wch: 12 }, // Rời cửa sổ
    { wch: 12 }, // Sao chép
    { wch: 12 }, // Dán nội dung
    { wch: 12 }, // Click phải
    { wch: 20 }, // Lần vi phạm cuối
  ]
  detailSheet['!cols'] = colWidths

  // Định dạng header (dòng đầu tiên)
  const headerRange = XLSX.utils.decode_range(detailSheet['!ref'] || 'A1')
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!detailSheet[cellAddress]) continue
    detailSheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  }

  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi tiết vi phạm')

  // Xuất file
  const fileName = `Vi_pham_${session.examName.replace(/[^a-zA-Z0-9]/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

