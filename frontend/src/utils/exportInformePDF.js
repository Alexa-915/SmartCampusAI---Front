import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Genera un informe institucional completo en PDF.
 * Incluye: portada, resumen ejecutivo, clases no asignadas,
 * análisis de salones, estadísticas y recomendaciones.
 */
export function exportarInformePDF({ resumen, diagnostico, dataset, usuario }) {
  const doc = new jsPDF('portrait', 'mm', 'a4')
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Colores del tema
  const PRIMARY   = [99, 102, 241]
  const DARK      = [15, 23, 42]
  const GRAY      = [100, 116, 139]
  const LIGHT     = [241, 245, 249]
  const GREEN     = [16, 185, 129]
  const RED       = [239, 68, 68]
  const YELLOW    = [245, 158, 11]
  const WHITE     = [255, 255, 255]

  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
  const hora  = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  let pageNum = 0

  // ── Helper: footer en cada página ──
  const addFooter = () => {
    pageNum++
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('SmartCampusAI — Reporte generado automáticamente', 14, H - 8)
    doc.text(`${fecha} — Página ${pageNum}`, W - 14, H - 8, { align: 'right' })
    doc.setDrawColor(226, 232, 240)
    doc.line(14, H - 12, W - 14, H - 12)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PORTADA
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 80, 'F')

  // Logo
  doc.setFillColor(...WHITE)
  doc.roundedRect(W / 2 - 12, 18, 24, 24, 5, 5, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PRIMARY)
  doc.text('S', W / 2 - 3, 34)

  // Título
  doc.setFontSize(20)
  doc.setTextColor(...WHITE)
  doc.text('SmartCampusAI', W / 2, 55, { align: 'center' })
  doc.setFontSize(10)
  doc.text('Sistema de Asignación Inteligente de Salones', W / 2, 63, { align: 'center' })

  // Subtítulo
  doc.setFontSize(14)
  doc.setTextColor(...DARK)
  doc.text('Informe de Asignación de Salones', W / 2, 100, { align: 'center' })

  // Info del dataset
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Dataset: ${dataset?.nombre || '—'}`, W / 2, 115, { align: 'center' })
  doc.text(`Generado: ${fecha} a las ${hora}`, W / 2, 122, { align: 'center' })
  if (usuario) doc.text(`Usuario: ${usuario}`, W / 2, 129, { align: 'center' })

  // KPIs en portada
  const kpis = [
    { label: 'Clases', value: resumen?.total_clases || 0 },
    { label: 'Salones', value: resumen?.total_salones || 0 },
    { label: 'Asignadas', value: resumen?.total_asignadas || 0 },
    { label: '% Éxito', value: `${resumen?.pct_exito || 0}%` },
  ]
  const kpiW = 38
  const kpiStart = (W - kpis.length * kpiW - (kpis.length - 1) * 6) / 2
  kpis.forEach((kpi, i) => {
    const x = kpiStart + i * (kpiW + 6)
    doc.setFillColor(...LIGHT)
    doc.roundedRect(x, 145, kpiW, 22, 3, 3, 'F')
    doc.setFillColor(...PRIMARY)
    doc.rect(x, 145 + 20, kpiW, 2, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(String(kpi.value), x + kpiW / 2, 156, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(kpi.label, x + kpiW / 2, 163, { align: 'center' })
  })

  addFooter()

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  let y = 20

  doc.setFillColor(...PRIMARY)
  doc.rect(0, 0, W, 14, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('1. Resumen Ejecutivo', 14, 10)

  y = 24

  const stats = [
    ['Clases procesadas', resumen?.total_clases],
    ['Clases asignadas', resumen?.total_asignadas],
    ['Clases sin asignar', resumen?.no_asignadas],
    ['Porcentaje de éxito', `${resumen?.pct_exito}%`],
    ['Salones disponibles', resumen?.total_salones],
    ['Salones utilizados', resumen?.salones_usados],
    ['Ocupación de salones', `${resumen?.pct_ocupacion}%`],
    ['Desperdicio promedio', `${resumen?.desperdicio_promedio} asientos`],
    ['Día más cargado', resumen?.dia_top],
    ['Salón más utilizado', resumen?.salon_top?.nombre],
    ['Bloque más utilizado', resumen?.bloque_top?.nombre],
  ]

  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: stats.map(([m, v]) => [m, String(v ?? '—')]),
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 4, textColor: DARK },
    headStyles: { fillColor: PRIMARY, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  })

  y = doc.lastAutoTable.finalY + 10

  // Distribución por día
  if (resumen?.por_dia) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Distribución por día', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Día', 'Clases asignadas']],
      body: Object.entries(resumen.por_dia).map(([d, c]) => [d, String(c)]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: PRIMARY, textColor: WHITE },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter()

  // ══════════════════════════════════════════════════════════════════════════
  // CLASES NO ASIGNADAS
  // ══════════════════════════════════════════════════════════════════════════
  if (diagnostico?.diagnosticos?.length > 0) {
    doc.addPage()
    doc.setFillColor(...RED)
    doc.rect(0, 0, W, 14, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(`2. Clases No Asignadas (${diagnostico.total_no_asignadas})`, 14, 10)

    // Conteo de razones
    if (diagnostico.conteo_razones) {
      let ry = 22
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...GRAY)
      const razones = Object.entries(diagnostico.conteo_razones).filter(([, v]) => v > 0)
      razones.forEach(([r, c]) => {
        doc.text(`• ${r}: ${c} clases`, 14, ry)
        ry += 4
      })
    }

    autoTable(doc, {
      startY: 22 + (Object.values(diagnostico.conteo_razones || {}).filter(v => v > 0).length * 4) + 4,
      head: [['Materia', 'Grupo', 'Horario', 'Est.', 'Razón']],
      body: diagnostico.diagnosticos.map(d => [
        d.materia, d.grupo, d.horario, String(d.estudiantes),
        (d.razones || []).join('; ').substring(0, 80),
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, textColor: DARK, overflow: 'linebreak' },
      headStyles: { fillColor: RED, textColor: WHITE },
      alternateRowStyles: { fillColor: [254, 226, 226] },
      columnStyles: { 4: { cellWidth: 60 } },
      margin: { left: 14, right: 14 },
    })

    addFooter()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANÁLISIS DE SALONES
  // ══════════════════════════════════════════════════════════════════════════
  if (diagnostico?.salones_libres?.length > 0) {
    doc.addPage()
    doc.setFillColor(...YELLOW)
    doc.rect(0, 0, W, 14, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(`3. Análisis de Salones (${diagnostico.total_salones_libres} sin utilizar)`, 14, 10)

    // Utilización
    if (diagnostico.utilizacion) {
      let uy = 22
      doc.setFontSize(9)
      doc.setTextColor(...DARK)
      doc.text(`Porcentaje de utilización: ${diagnostico.utilizacion.porcentaje}%`, 14, uy)
      uy += 5
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(`${diagnostico.utilizacion.salones_usados} usados / ${diagnostico.utilizacion.salones_libres} libres / ${diagnostico.utilizacion.total_salones} total`, 14, uy)
      uy += 8

      // Razones de no uso
      if (diagnostico.utilizacion.razones_no_uso) {
        Object.entries(diagnostico.utilizacion.razones_no_uso).forEach(([r, c]) => {
          doc.text(`• ${r}: ${c} salones`, 14, uy)
          uy += 4
        })
      }
    }

    autoTable(doc, {
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 55,
      head: [['Código', 'Bloque', 'Cap.', 'Equipo', 'Razón', 'Compat.']],
      body: diagnostico.salones_libres.slice(0, 30).map(s => [
        s.codigo, s.bloque, String(s.capacidad),
        [s.tiene_computadores && 'PC', s.es_laboratorio && 'Lab', s.tiene_videobeam && 'VB'].filter(Boolean).join(', ') || '—',
        s.razon_principal, String(s.clases_compatibles),
      ]),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: YELLOW, textColor: DARK, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [254, 243, 199] },
      margin: { left: 14, right: 14 },
    })

    addFooter()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PATRONES Y RECOMENDACIONES
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  doc.setFillColor(...GREEN)
  doc.rect(0, 0, W, 14, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('4. Patrones Detectados y Recomendaciones', 14, 10)

  let fy = 24

  // Patrones
  if (diagnostico?.patrones?.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Patrones detectados:', 14, fy)
    fy += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    diagnostico.patrones.forEach(p => {
      doc.text(`⚠ ${p}`, 16, fy)
      fy += 5
    })
    fy += 6
  }

  // Recomendaciones
  if (diagnostico?.recomendaciones?.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text('Recomendaciones del sistema:', 14, fy)
    fy += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    diagnostico.recomendaciones.forEach(r => {
      doc.text(`✓ ${r}`, 16, fy)
      fy += 5
    })
    fy += 6
  }

  // Conclusión automática
  fy += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Conclusión:', 14, fy)
  fy += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)

  const pct = resumen?.pct_exito || 0
  const conclusion = pct >= 95
    ? `El solver logró un resultado excelente (${pct}%). La infraestructura disponible es adecuada para la demanda actual.`
    : pct >= 80
    ? `El solver logró un buen resultado (${pct}%). Se recomienda revisar la disponibilidad de recursos especializados para mejorar la cobertura.`
    : `El resultado fue parcial (${pct}%). Se detectan limitaciones importantes en la infraestructura que impiden cubrir toda la demanda académica.`

  const lines = doc.splitTextToSize(conclusion, W - 28)
  doc.text(lines, 14, fy)

  addFooter()

  // ── Guardar ──
  const nombreArchivo = `Informe_SmartCampusAI_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(nombreArchivo)
}
