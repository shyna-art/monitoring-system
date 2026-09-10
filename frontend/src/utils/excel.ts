import * as XLSX from 'xlsx'

export function exportToExcel(
  filename: string,
  sheetName: string,
  data: Record<string, unknown>[]
): void {
  if (!data || data.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  XLSX.writeFile(workbook, `${filename}.xlsx`)
}