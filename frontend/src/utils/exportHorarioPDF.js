import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const HORAS = ['6:00','7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']

const PRIMARY = [99, 102, 241]
const DARK    = [15, 23, 42]
const GRAY    = [100, 116, 139]
const LIGHT   = [241, 245, 249]
const GREEN   = [16, 185, 129]
const RED     = [239, 68, 68]
const YELLOW  = [245, 158, 11]
const BLUE    = [59, 130, 246]
const WHITE   = [255, 255, 255]

const parseHora = (h) => {
  if (!h) return { inicio: 0, fin: 0 }
  const sep = h.includes('–') ? '–' : '-'
  const [i, f] = h.split(sep).map(t => {
    const [hh, mm] = t.trim().split(':').map(Number)
    return hh + (mm || 0) / 60
  })
  return { inicio: i, fin: f }
}

/**
 * Genera un PDF institucional completo del horario general.
 */
export function exportarHorarioPDF({ asignaciones, dataset, usuario }) {
  const doc = new jsPDF('landscape', 'mm', 'a4')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let pageNum = 0

  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const hora  = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  const addFooter = () => {
    pageNum++
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('SmartCampusAI — Horario General Institucional', 14, H - 7)
    doc.text(`${fecha} — Página ${pageNum}`, W - 14, H - 7, { align: 'right' })
    doc.setDrawColor(226, 232, 240)
    doc.line(14, H - 11, W - 14, H - 11)
  }

  const addHeader = (title) => {
    doc.setFillColor(...PRIMARY)
    doc.rect(0, 0, W, 14, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(title, 14, 9)
    doc.text('SmartCampusAI', W - 14, 9, { align: 'right' })
  }

  // Datos derivados
  const salones    = [...new Set(asignaciones.map(a => a.salon_asignado))].sort()
  const profesores = [...new Set(asignaciones.map(a => a.profesor))].sort()
  const total      = asignaciones.length

  // ══════════════════════════════════════════════════════════════════════════
  // PORTADA
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 60, 'F')

  doc.setFillColor(...WHITE)
  doc.roundedRect(W / 2 - 10, 12, 20, 20, 4, 4, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text('S', W / 2 - 3, 26)

  doc.setFontSize(18)
  doc.setTextColor(...WHITE)
  doc.text('Horario General Institucional', W / 2, 48, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(...DARK)
  doc.text('SmartCampusAI — Sistema de Asignación Inteligente', W / 2, 75, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Dataset: ${dataset?.nombre || '—'}`, W / 2, 90, { align: 'center' })
  doc.text(`Generado: ${fecha} a las ${hora}`, W / 2, 97, { align: 'center' })
  if (usuario) doc.text(`Usuario: ${usuario}`, W / 2, 104, { align: 'center' })

  // KPIs portada
  const kpis = [
    { l: 'Asignaciones', v: total },
    { l: 'Salones', v: salones.length },
    { l: 'Profesores', v: profesores.length },
  ]
  const kW = 45
  const kStart = (W - kpis.length * kW - (kpis.length - 1) * 8) / 2
  kpis.forEach((k, i) => {
    const x = kStart + i * (kW + 8)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, 115, kW, 20, 3, 3, 'F')
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(String(k.v), x + kW / 2, 127, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(k.l, x + kW / 2, 133, { align: 'center' })
  })

  addFooter()

  // ══════════════════════════════════════════════════════════════════════════
  // HORARIO GENERAL SEMANAL
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  addHeader('Horario General Semanal')

  // Construir tabla del horario
  const horarioBody = HORAS.map(hora => {
    const h = parseInt(hora)
    const row = [hora]
    DIAS.forEach(dia => {
      const clases = asignaciones.filter(a => {
        if (a.dia_asignado !== dia) return false
        const { inicio, fin } = parseHora(a.horario)
        return h >= inicio && h < fin
      })
      row.push(clases.map(c => `${c.materia}\n${c.salon_asignado}`).join('\n---\n') || '—')
    })
    return row
  })

  autoTable(doc, {
    startY: 20,
    head: [['Hora', ...DIAS]],
    body: horarioBody,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 2, textColor: DARK, overflow: 'linebreak', minCellHeight: 8 },
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' } },
    margin: { left: 8, right: 8 },
  })

  addFooter()

  // ══════════════════════════════════════════════════════════════════════════
  // HORARIOS POR SALÓN (top 15 más usados)
  // ══════════════════════════════════════════════════════════════════════════
  const salonCount = {}
  asignaciones.forEach(a => { salonCount[a.salon_asignado] = (salonCount[a.salon_asignado] || 0) + 1 })
  const topSalones = Object.entries(salonCount).sort((a, b) => b[1] - a[1]).slice(0, 15)

  topSalones.forEach(([salonId, count]) => {
    doc.addPage()
    addHeader(`Horario: Salón ${salonId} (${count} clases)`)

    const salonAsig = asignaciones.filter(a => a.salon_asignado === salonId)
    const body = HORAS.map(hora => {
      const h = parseInt(hora)
      const row = [hora]
      DIAS.forEach(dia => {
        const clases = salonAsig.filter(a => {
          if (a.dia_asignado !== dia) return false
          const { inicio, fin } = parseHora(a.horario)
          return h >= inicio && h < fin
        })
        row.push(clases.map(c => `${c.materia} (${c.grupo})\n${c.profesor}`).join('\n') || '')
      })
      return row
    })

    autoTable(doc, {
      startY: 20,
      head: [['Hora', ...DIAS]],
      body,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, textColor: DARK, overflow: 'linebreak', minCellHeight: 7 },
      headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [219, 234, 254] },
      columnStyles: { 0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' } },
      margin: { left: 8, right: 8 },
    })

    addFooter()
  })

  // ══════════════════════════════════════════════════════════════════════════
  // HORARIOS POR PROFESOR (top 10)
  // ══════════════════════════════════════════════════════════════════════════
  const profCount = {}
  asignaciones.forEach(a => { profCount[a.profesor] = (profCount[a.profesor] || 0) + 1 })
  const topProfs = Object.entries(profCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  doc.addPage()
  addHeader('Carga Docente — Profesores con más asignaciones')

  const profBody = topProfs.map(([prof, count]) => {
    const clases = asignaciones.filter(a => a.profesor === prof)
    const materias = [...new Set(clases.map(c => c.materia))].join(', ')
    const dias = [...new Set(clases.map(c => c.dia_asignado))].join(', ')
    return [prof, String(count), materias.substring(0, 50), dias]
  })

  autoTable(doc, {
    startY: 20,
    head: [['Profesor', 'Clases', 'Materias', 'Días']],
    body: profBody,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: GREEN, textColor: WHITE },
    alternateRowStyles: { fillColor: [209, 250, 229] },
    margin: { left: 14, right: 14 },
  })

  addFooter()

  // ══════════════════════════════════════════════════════════════════════════
  // MAPA DE OCUPACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  addHeader('Mapa de Ocupación por Horario')

  const ocupBody = HORAS.map(hora => {
    const h = parseInt(hora)
    const row = [hora]
    DIAS.forEach(dia => {
      const count = asignaciones.filter(a => {
        if (a.dia_asignado !== dia) return false
        const { inicio } = parseHora(a.horario)
        return Math.floor(inicio) === h
      }).length
      row.push(String(count))
    })
    const totalHora = row.slice(1).reduce((a, b) => a + parseInt(b), 0)
    row.push(String(totalHora))
    return row
  })

  autoTable(doc, {
    startY: 20,
    head: [['Hora', ...DIAS, 'Total']],
    body: ocupBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: DARK, halign: 'center' },
    headStyles: { fillColor: YELLOW, textColor: DARK, fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold' }, 6: { fontStyle: 'bold', fillColor: [254, 243, 199] } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index > 0 && data.column.index < 6) {
        const val = parseInt(data.cell.raw)
        if (val >= 8) data.cell.styles.fillColor = [254, 202, 202]
        else if (val >= 5) data.cell.styles.fillColor = [254, 243, 199]
        else if (val >= 1) data.cell.styles.fillColor = [209, 250, 229]
      }
    },
  })

  // Leyenda
  const ly = doc.lastAutoTable.finalY + 8
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('🟩 Baja (1-4)    🟨 Media (5-7)    🟥 Alta (8+)', 14, ly)

  addFooter()

  // ── Guardar ──
  const nombre = `Horario_General_SmartCampusAI_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(nombre)
}
