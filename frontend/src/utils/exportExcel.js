import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/**
 * Exporta un array de objetos a un archivo Excel.
 * data: array de objetos (filas)
 * columns: [{ key, label }] — define qué campos exportar y con qué nombre de columna
 * filename: nombre del archivo sin extensión
 */
export function exportarExcel(data, columns, filename = 'exportacion') {
  // Crear filas con solo las columnas que queremos y con los headers bonitos
  const rows = data.map(row =>
    columns.reduce((acc, col) => {
      acc[col.label] = row[col.key] ?? ''
      return acc
    }, {})
  )

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')

  // Ajustar ancho de columnas automáticamente
  const maxWidths = columns.map(col => {
    const headerLen = col.label.length
    const maxData   = Math.max(...data.map(r => String(r[col.key] ?? '').length), 0)
    return { wch: Math.max(headerLen, maxData) + 2 }
  })
  ws['!cols'] = maxWidths

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob   = new Blob([buffer], { type: 'application/octet-stream' })
  saveAs(blob, `${filename}.xlsx`)
}
