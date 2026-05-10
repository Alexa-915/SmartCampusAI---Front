import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Genera un PDF profesional con diseño moderno.
 *
 * @param {Object} config
 * @param {string} config.titulo - Título del reporte
 * @param {string} config.subtitulo - Subtítulo o descripción
 * @param {string} config.dataset - Nombre del dataset
 * @param {string} config.usuario - Nombre del usuario
 * @param {Array} config.columns - [{ key, label }]
 * @param {Array} config.data - Array de objetos (filas)
 * @param {Object} config.estadisticas - KPIs opcionales { label: value }
 * @param {string} config.filename - Nombre del archivo sin extensión
 */
export function exportarPDF({
  titulo = 'Reporte',
  subtitulo = '',
  dataset = '',
  usuario = '',
  columns = [],
  data = [],
  estadisticas = null,
  filename = 'reporte',
}) {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // ── Colores del tema ──────────────────────────────────────────────────
  const PRIMARY    = [99, 102, 241]   // indigo
  const DARK       = [15, 23, 42]     // slate-900
  const GRAY       = [100, 116, 139]  // slate-500
  const LIGHT_BG   = [248, 250, 252]  // slate-50
  const WHITE      = [255, 255, 255]

  // ── Header del documento ──────────────────────────────────────────────
  const drawHeader = () => {
    // Barra superior con gradiente simulado
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, pageWidth, 22, 'F')

    // Logo (cuadrado con "S")
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(12, 4, 14, 14, 3, 3, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PRIMARY)
    doc.text('S', 16.5, 13)

    // Nombre del sistema
    doc.setFontSize(13)
    doc.setTextColor(...WHITE)
    doc.setFont('helvetica', 'bold')
    doc.text('SmartCampusAI', 30, 10)

    // Subtítulo en header
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(200, 210, 255)
    doc.text('Sistema de Asignación Inteligente de Salones', 30, 16)

    // Fecha y hora a la derecha
    const ahora = new Date()
    const fecha = ahora.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const hora = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

    doc.setFontSize(8)
    doc.setTextColor(...WHITE)
    doc.text(`${fecha} — ${hora}`, pageWidth - 14, 10, { align: 'right' })
    if (usuario) {
      doc.text(`Usuario: ${usuario}`, pageWidth - 14, 16, { align: 'right' })
    }
  }

  drawHeader()

  // ── Título del reporte ────────────────────────────────────────────────
  let yPos = 32

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(titulo, 14, yPos)
  yPos += 7

  if (subtitulo) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(subtitulo, 14, yPos)
    yPos += 5
  }

  if (dataset) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(`Dataset: ${dataset}`, 14, yPos)
    yPos += 8
  }

  // ── Estadísticas / KPIs ───────────────────────────────────────────────
  if (estadisticas && Object.keys(estadisticas).length > 0) {
    const entries = Object.entries(estadisticas)
    const cardWidth = (pageWidth - 28 - (entries.length - 1) * 4) / entries.length
    const cardHeight = 16

    entries.forEach(([label, value], i) => {
      const x = 14 + i * (cardWidth + 4)

      // Card background
      doc.setFillColor(...LIGHT_BG)
      doc.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'F')

      // Borde inferior de color
      doc.setFillColor(...PRIMARY)
      doc.rect(x, yPos + cardHeight - 1.5, cardWidth, 1.5, 'F')

      // Valor
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text(String(value), x + 5, yPos + 7)

      // Label
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text(label, x + 5, yPos + 12)
    })

    yPos += cardHeight + 8
  }

  // ── Tabla principal ───────────────────────────────────────────────────
  const headers = columns.map(c => c.label)
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key]
      if (typeof val === 'boolean') return val ? 'Sí' : 'No'
      return val ?? '—'
    })
  )

  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
      textColor: DARK,
      font: 'helvetica',
    },
    headStyles: {
      fillColor: PRIMARY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: LIGHT_BG,
    },
    margin: { left: 14, right: 14 },
    // Footer con paginación
    didDrawPage: (data) => {
      // Línea separadora del footer
      doc.setDrawColor(226, 232, 240)
      doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12)

      // Número de página
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      doc.text(
        `Página ${doc.internal.getNumberOfPages()}`,
        pageWidth - 14,
        pageHeight - 7,
        { align: 'right' }
      )

      // Marca de agua
      doc.text('Generado por SmartCampusAI', 14, pageHeight - 7)

      // Re-dibujar header en páginas siguientes
      if (data.pageNumber > 1) {
        drawHeader()
      }
    },
  })

  // ── Guardar ───────────────────────────────────────────────────────────
  doc.save(`${filename}.pdf`)
}
