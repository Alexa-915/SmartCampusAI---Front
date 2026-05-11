import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Building2, User, BookOpen, Filter, X, AlertTriangle, Clock } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Loader from '../components/ui/Loader'
import { useDataset } from '../context/DatasetContext'
import { useAuth } from '../context/AuthContext'
import { getAsignaciones } from '../services/api'
import { exportarHorarioPDF } from '../utils/exportHorarioPDF'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const HORAS = ['6:00','7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']

// Parsear "7:00–9:00" → { inicio: 7, fin: 9 }
const parseHora = (h) => {
  if (!h) return { inicio: 0, fin: 0 }
  const sep = h.includes('–') ? '–' : '-'
  const [i, f] = h.split(sep).map(t => {
    const [hh, mm] = t.trim().split(':').map(Number)
    return hh + (mm || 0) / 60
  })
  return { inicio: i, fin: f }
}

export default function Resultados() {
  const { dataset } = useDataset()
  const { usuario } = useAuth()
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading]           = useState(true)
  const [vista, setVista]               = useState('general') // general | salon | profesor
  const [filtroSalon, setFiltroSalon]   = useState('')
  const [filtroProfesor, setFiltroProfesor] = useState('')
  const [filtroDia, setFiltroDia]       = useState('')
  const [filtroMateria, setFiltroMateria] = useState('')
  const [hoveredClase, setHoveredClase] = useState(null)

  useEffect(() => {
    if (!dataset?.id) { setLoading(false); return }
    setLoading(true)
    getAsignaciones(dataset.id)
      .then(res => setAsignaciones(res.data))
      .catch(() => setAsignaciones([]))
      .finally(() => setLoading(false))
  }, [dataset?.id])

  // Listas únicas para filtros
  const salones    = useMemo(() => [...new Set(asignaciones.map(a => a.salon_asignado))].sort(), [asignaciones])
  const profesores = useMemo(() => [...new Set(asignaciones.map(a => a.profesor))].sort(), [asignaciones])
  const materias   = useMemo(() => [...new Set(asignaciones.map(a => a.materia))].sort(), [asignaciones])

  // Filtrar asignaciones
  const filtradas = useMemo(() => {
    let r = asignaciones
    if (filtroSalon) r = r.filter(a => a.salon_asignado === filtroSalon)
    if (filtroProfesor) r = r.filter(a => a.profesor === filtroProfesor)
    if (filtroDia) r = r.filter(a => a.dia_asignado === filtroDia)
    if (filtroMateria) r = r.filter(a => a.materia === filtroMateria)
    return r
  }, [asignaciones, filtroSalon, filtroProfesor, filtroDia, filtroMateria])

  const hayFiltros = filtroSalon || filtroProfesor || filtroDia || filtroMateria
  const limpiarFiltros = () => { setFiltroSalon(''); setFiltroProfesor(''); setFiltroDia(''); setFiltroMateria('') }

  // Obtener clases para un día y hora específica
  const clasesEnSlot = (dia, hora) => {
    const h = parseFloat(hora.split(':')[0])
    return filtradas.filter(a => {
      if (a.dia_asignado !== dia) return false
      const { inicio, fin } = parseHora(a.horario)
      return h >= inicio && h < fin
    })
  }

  // Color según tipo
  const colorClase = (a) => {
    if (a.requiere_lab) return { bg: 'var(--green-light)', border: 'var(--green)', text: 'var(--green-text)' }
    if (a.requiere_pc) return { bg: 'var(--yellow-light)', border: 'var(--yellow)', text: 'var(--yellow-text)' }
    if (a.requiere_vb) return { bg: 'var(--blue-light)', border: 'var(--blue)', text: 'var(--blue-text)' }
    return { bg: 'var(--accent-light)', border: 'var(--accent)', text: 'var(--accent-text)' }
  }

  if (loading) return <AppLayout><Loader text="Cargando resultados..." /></AppLayout>

  if (!dataset) return (
    <AppLayout>
      <Card style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</p>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Selecciona un dataset primero</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ve a Datos y selecciona o crea un dataset.</p>
      </Card>
    </AppLayout>
  )

  if (asignaciones.length === 0) return (
    <AppLayout>
      <Card style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</p>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sin asignaciones</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Ejecuta el solver desde el Dashboard para generar resultados.</p>
      </Card>
    </AppLayout>
  )

  return (
    <AppLayout>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Horario General</h1>
          <p style={s.sub}>{filtradas.length} asignaciones • {dataset?.nombre}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant={vista === 'general' ? 'accent' : 'default'} style={{ cursor: 'pointer' }}>
            <button onClick={() => { setVista('general'); limpiarFiltros() }} style={s.vistaBtn}>General</button>
          </Badge>
          <Badge variant={vista === 'salon' ? 'accent' : 'default'}>
            <button onClick={() => setVista('salon')} style={s.vistaBtn}>Por Salón</button>
          </Badge>
          <Badge variant={vista === 'profesor' ? 'accent' : 'default'}>
            <button onClick={() => setVista('profesor')} style={s.vistaBtn}>Por Profesor</button>
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportarHorarioPDF({ asignaciones, dataset, usuario: usuario?.nombre })}
          >
            📄 Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        <div style={s.filterRow}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />

          {(vista === 'salon' || vista === 'general') && (
            <select value={filtroSalon} onChange={e => setFiltroSalon(e.target.value)} style={s.filterSelect}>
              <option value="">Todos los salones</option>
              {salones.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {(vista === 'profesor' || vista === 'general') && (
            <select value={filtroProfesor} onChange={e => setFiltroProfesor(e.target.value)} style={s.filterSelect}>
              <option value="">Todos los profesores</option>
              {profesores.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <select value={filtroDia} onChange={e => setFiltroDia(e.target.value)} style={s.filterSelect}>
            <option value="">Todos los días</option>
            {DIAS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select value={filtroMateria} onChange={e => setFiltroMateria(e.target.value)} style={s.filterSelect}>
            <option value="">Todas las materias</option>
            {materias.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          {hayFiltros && (
            <button onClick={limpiarFiltros} style={{ ...s.filterSelect, color: 'var(--red)', cursor: 'pointer', border: '1px solid var(--red)' }}>
              <X size={12} /> Limpiar
            </button>
          )}
        </div>
      </Card>

      {/* Calendario semanal */}
      <Card padding="0" style={{ overflow: 'hidden' }}>
        <div style={s.calendar}>
          {/* Header de días */}
          <div style={s.calHeader}>
            <div style={s.calHoraHeader}><Clock size={12} /></div>
            {DIAS.map(dia => (
              <div key={dia} style={s.calDiaHeader}>{dia}</div>
            ))}
          </div>

          {/* Grid de horas */}
          <div style={s.calBody}>
            {HORAS.map(hora => (
              <div key={hora} style={s.calRow}>
                <div style={s.calHoraCell}>{hora}</div>
                {DIAS.map(dia => {
                  const clases = clasesEnSlot(dia, hora)
                  return (
                    <div key={`${dia}-${hora}`} style={s.calCell}>
                      {clases.map((a, i) => {
                        const color = colorClase(a)
                        return (
                          <motion.div
                            key={a.id || i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                              ...s.claseCard,
                              background: color.bg,
                              borderLeft: `3px solid ${color.border}`,
                            }}
                            onMouseEnter={() => setHoveredClase(a)}
                            onMouseLeave={() => setHoveredClase(null)}
                          >
                            <span style={{ ...s.claseMateria, color: color.text }}>{a.materia}</span>
                            <span style={s.claseInfo}>{a.salon_asignado}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tooltip flotante */}
      <AnimatePresence>
        {hoveredClase && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={s.tooltip}
          >
            <p style={s.tooltipTitle}>{hoveredClase.materia} — {hoveredClase.grupo}</p>
            <p style={s.tooltipLine}>👨‍🏫 {hoveredClase.profesor}</p>
            <p style={s.tooltipLine}>🏫 {hoveredClase.salon_asignado} ({hoveredClase.bloque_salon})</p>
            <p style={s.tooltipLine}>🕐 {hoveredClase.horario} • {hoveredClase.dia_asignado}</p>
            <p style={s.tooltipLine}>👥 {hoveredClase.estudiantes} estudiantes • Cap: {hoveredClase.capacidad_salon}</p>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {hoveredClase.requiere_vb && <Badge variant="blue">VB</Badge>}
              {hoveredClase.requiere_pc && <Badge variant="yellow">PC</Badge>}
              {hoveredClase.requiere_lab && <Badge variant="green">Lab</Badge>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leyenda */}
      <div style={s.legend}>
        <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--accent)' }} /> Normal</span>
        <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--green)' }} /> Laboratorio</span>
        <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--yellow)' }} /> Con PC</span>
        <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--blue)' }} /> Videobeam</span>
      </div>

      {/* Estadísticas rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        <MiniStat icon={Calendar} label="Asignaciones" value={filtradas.length} />
        <MiniStat icon={Building2} label="Salones usados" value={salones.length} />
        <MiniStat icon={User} label="Profesores" value={profesores.length} />
        <MiniStat icon={BookOpen} label="Materias" value={materias.length} />
      </div>
    </AppLayout>
  )
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <Card hover style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem' }}>
      <Icon size={16} style={{ color: 'var(--accent)' }} />
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
      </div>
    </Card>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  sub: { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  vistaBtn: { background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, color: 'inherit', padding: 0 },
  filterRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filterSelect: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
  calendar: { width: '100%' },
  calHeader: { display: 'grid', gridTemplateColumns: '50px repeat(5, 1fr)', borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' },
  calHoraHeader: { padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' },
  calDiaHeader: { padding: '10px 8px', textAlign: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  calBody: { maxHeight: '65vh', overflowY: 'auto' },
  calRow: { display: 'grid', gridTemplateColumns: '50px repeat(5, 1fr)', borderBottom: '1px solid var(--border)', minHeight: 44 },
  calHoraCell: { padding: '6px 4px', fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', borderRight: '1px solid var(--border)', background: 'var(--bg-subtle)' },
  calCell: { padding: '2px 3px', display: 'flex', flexDirection: 'column', gap: 2, borderRight: '1px solid var(--border)', minHeight: 40 },
  claseCard: { padding: '3px 6px', borderRadius: 4, cursor: 'pointer', transition: 'transform 0.1s', overflow: 'hidden' },
  claseMateria: { fontSize: '0.65rem', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  claseInfo: { fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' },
  tooltip: { position: 'fixed', bottom: 20, right: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-lg)', zIndex: 1000, maxWidth: 280 },
  tooltipTitle: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
  tooltipLine: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 3 },
  legend: { display: 'flex', gap: 16, marginTop: '0.75rem', padding: '0.5rem 0' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-muted)' },
  legendDot: { width: 8, height: 8, borderRadius: 2, display: 'inline-block' },
}
