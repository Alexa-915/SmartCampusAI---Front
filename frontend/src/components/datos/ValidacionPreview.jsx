import { motion } from 'framer-motion'
import { AlertTriangle, XCircle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

/**
 * Muestra el resultado de la validación del Excel antes de confirmar la carga.
 * resultado: objeto retornado por /validar/clases
 * onConfirmar: callback para proceder con la carga
 * onCancelar: callback para cancelar
 * loading: boolean
 */
export default function ValidacionPreview({ resultado, onConfirmar, onCancelar, loading }) {
  if (!resultado) return null

  const { total_filas, errores, advertencias, total_errores, total_advertencias, puede_cargar, preview } = resultado

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      {/* Resumen */}
      <div style={s.summary}>
        <FileSpreadsheet size={18} style={{ color: 'var(--accent)' }} />
        <span style={s.summaryText}>
          {total_filas} filas analizadas
        </span>
        {total_errores > 0 && <Badge variant="red">{total_errores} error{total_errores > 1 ? 'es' : ''}</Badge>}
        {total_advertencias > 0 && <Badge variant="yellow">{total_advertencias} advertencia{total_advertencias > 1 ? 's' : ''}</Badge>}
        {total_errores === 0 && total_advertencias === 0 && <Badge variant="green">Sin problemas</Badge>}
      </div>

      {/* Errores críticos */}
      {errores.length > 0 && (
        <div style={s.errorSection}>
          <div style={s.sectionHeader}>
            <XCircle size={14} style={{ color: 'var(--red)' }} />
            <span style={{ fontWeight: 600, color: 'var(--red-text)' }}>
              Errores encontrados — se recomienda corregir después de cargar
            </span>
          </div>
          <div style={s.errorList}>
            {errores.slice(0, 15).map((e, i) => (
              <div key={i} style={s.errorItem}>
                <Badge variant="red">Fila {e.fila}</Badge>
                <span style={s.errorMsg}>{e.mensaje}</span>
              </div>
            ))}
            {errores.length > 15 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', paddingLeft: 8 }}>
                ...y {errores.length - 15} errores más.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Advertencias */}
      {advertencias.length > 0 && (
        <div style={s.warnSection}>
          <div style={s.sectionHeader}>
            <AlertTriangle size={14} style={{ color: 'var(--yellow)' }} />
            <span style={{ fontWeight: 600, color: 'var(--yellow-text)' }}>
              Advertencias — puedes continuar pero revisa
            </span>
          </div>
          <div style={s.errorList}>
            {advertencias.slice(0, 10).map((a, i) => (
              <div key={i} style={s.warnItem}>
                <Badge variant="yellow">Fila {a.fila}</Badge>
                <span style={s.warnMsg}>{a.mensaje}</span>
              </div>
            ))}
            {advertencias.length > 10 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', paddingLeft: 8 }}>
                ...y {advertencias.length - 10} advertencias más.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Preview de datos — detecta automáticamente si es clases o salones */}
      {preview && preview.length > 0 && (() => {
        const esSalones = 'codigo' in preview[0]
        const cols = esSalones
          ? ['Código', 'Bloque', 'Capacidad', 'Tipología']
          : ['Materia', 'Grupo', 'Profesor', 'Tipo', 'Horario', 'Est.']
        const keys = esSalones
          ? ['codigo', 'bloque', 'capacidad', 'tipologia']
          : ['materia', 'grupo', 'profesor', 'tipo', 'horario', 'estudiantes']

        return (
          <div style={s.previewSection}>
            <p style={s.previewTitle}>Vista previa (primeras {preview.length} filas)</p>
            <div style={s.previewTable}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>#</th>
                    {cols.map(c => <th key={c} style={s.th}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const tieneError = errores.some(e => e.fila === i + 2)
                    const tieneWarn  = advertencias.some(a => a.fila === i + 2)
                    return (
                      <tr key={i} style={{
                        ...s.tr,
                        background: tieneError ? 'var(--red-light)' : tieneWarn ? 'var(--yellow-light)' : 'transparent',
                      }}>
                        <td style={s.td}>{i + 1}</td>
                        {keys.map(k => <td key={k} style={s.td}>{row[k] ?? '—'}</td>)}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Todo OK */}
      {puede_cargar && total_errores === 0 && total_advertencias === 0 && (
        <div style={s.successBanner}>
          <CheckCircle size={16} style={{ color: 'var(--green)' }} />
          <span>El archivo no tiene errores. Listo para cargar.</span>
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button
          onClick={onConfirmar}
          loading={loading}
        >
          {total_errores > 0
            ? `Cargar de todas formas (${total_errores} error${total_errores > 1 ? 'es' : ''})`
            : 'Confirmar carga'}
        </Button>
      </div>
    </motion.div>
  )
}

const s = {
  summary: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: 'var(--bg-subtle)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  summaryText: { fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' },
  errorSection: {
    background: 'var(--red-light)',
    border: '1px solid var(--red)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
  },
  warnSection: {
    background: 'var(--yellow-light)',
    border: '1px solid var(--yellow)',
    borderRadius: 'var(--radius-md)',
    padding: '12px',
  },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.82rem' },
  errorList: { display: 'flex', flexDirection: 'column', gap: 6 },
  errorItem: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem' },
  errorMsg: { color: 'var(--red-text)', lineHeight: 1.4 },
  warnItem: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.78rem' },
  warnMsg: { color: 'var(--yellow-text)', lineHeight: 1.4 },
  previewSection: { marginTop: 4 },
  previewTitle: { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' },
  previewTable: { overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th: { padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
  td: { padding: '6px 10px', color: 'var(--text-primary)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' },
  successBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: 'var(--green-light)',
    border: '1px solid var(--green)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.85rem', color: 'var(--green-text)', fontWeight: 500,
  },
}
