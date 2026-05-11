import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle, Calendar, TrendingUp, Building2, Play, RefreshCw,
  AlertTriangle, XCircle, BarChart3, Clock, Users, Zap,
} from 'lucide-react'
import { getResumen, resolverCSP, getDatasets, getDiagnostico } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useDataset } from '../context/DatasetContext'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Loader from '../components/ui/Loader'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function Dashboard() {
  const [resumen, setResumen]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [running, setRunning]       = useState(false)
  const [alert, setAlert]           = useState(null)
  const [datasets, setDatasets]     = useState([])
  const [diagnostico, setDiagnostico] = useState(null)

  const { usuario } = useAuth()
  const { dataset, seleccionarDataset } = useDataset()
  const isAdmin   = usuario?.rol === 'admin'
  const datasetId = dataset?.id || null

  useEffect(() => {
    getDatasets()
      .then(res => {
        setDatasets(res.data)
        if (res.data.length > 0 && !dataset) seleccionarDataset(res.data[0])
        else if (res.data.length === 0) setLoading(false)
      })
      .catch(() => { setAlert({ type: 'error', message: 'No se pudo conectar con el servidor.' }); setLoading(false) })
  }, [])

  useEffect(() => { if (datasetId) fetchResumen(datasetId) }, [datasetId])

  const fetchResumen = (id) => {
    setLoading(true)
    Promise.all([getResumen(id), getDiagnostico(id).catch(() => ({ data: null }))])
      .then(([rRes, dRes]) => { setResumen(rRes.data); setDiagnostico(dRes.data) })
      .catch(() => { setResumen(null); setDiagnostico(null) })
      .finally(() => setLoading(false))
  }

  const handleResolver = async () => {
    if (!datasetId) { setAlert({ type: 'error', message: 'No hay dataset seleccionado.' }); return }
    setRunning(true); setAlert(null)
    try {
      const res = await resolverCSP(datasetId)
      setAlert({ type: 'success', message: `Solver completado — ${res.data.asignadas} asignadas, ${res.data.no_asignadas} sin asignar (${res.data.pct_exito}% éxito)` })
      fetchResumen(datasetId)
    } catch { setAlert({ type: 'error', message: 'Error al ejecutar el solver. Verifica que el dataset tenga clases y salones.' }) }
    finally { setRunning(false) }
  }

  const r = resumen // alias corto
  const maxDia = r ? Math.max(...DIAS.map(d => r.por_dia?.[d] || 0), 1) : 1

  return (
    <AppLayout>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.pageTitle}>Panel de Análisis</h1>
          <p style={s.pageSub}>
            Bienvenido, <strong>{usuario?.nombre || 'usuario'}</strong> —{' '}
            <Badge variant={isAdmin ? 'accent' : 'default'}>{usuario?.rol || 'viewer'}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {datasets.length > 0 && (
            <select value={datasetId || ''} onChange={e => { const ds = datasets.find(d => d.id === Number(e.target.value)); if (ds) seleccionarDataset(ds) }} style={s.select}>
              {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.nombre}</option>)}
            </select>
          )}
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => fetchResumen(datasetId)}>Actualizar</Button>
          {isAdmin && <Button variant="yellow" size="sm" icon={<Play size={14} />} loading={running} onClick={handleResolver}>Ejecutar Solver</Button>}
        </div>
      </div>

      <div style={{ marginBottom: alert ? '1.5rem' : 0 }}>
        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      </div>

      {loading ? <Loader text="Cargando análisis..." /> : r ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>

          {/* ── Resumen inteligente del solver ── */}
          <Card style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${r.pct_exito >= 90 ? 'var(--green)' : r.pct_exito >= 70 ? 'var(--yellow)' : 'var(--red)'}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Zap size={20} style={{ color: r.pct_exito >= 90 ? 'var(--green)' : 'var(--yellow)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Resumen del Solver</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {r.pct_exito >= 95
                    ? `Excelente resultado. El solver asignó el ${r.pct_exito}% de las clases (${r.total_asignadas} de ${r.total_clases}). La distribución es equilibrada y el desperdicio promedio de capacidad es de ${r.desperdicio_promedio} asientos por salón.`
                    : r.pct_exito >= 80
                    ? `Buen resultado. Se asignaron ${r.total_asignadas} de ${r.total_clases} clases (${r.pct_exito}%). ${r.no_asignadas} clases no pudieron ubicarse, posiblemente por falta de salones compatibles o conflictos de capacidad.`
                    : `Resultado parcial. Solo se asignaron ${r.total_asignadas} de ${r.total_clases} clases (${r.pct_exito}%). Se recomienda revisar la disponibilidad de salones y los requisitos de las clases no asignadas.`
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* ── KPIs principales ── */}
          <div style={s.kpiGrid}>
            <KpiCard icon={CheckCircle} value={r.total_asignadas} label="Clases asignadas" color="var(--green)" colorLight="var(--green-light)" delay={0} />
            <KpiCard icon={XCircle} value={r.no_asignadas} label="Sin asignar" color="var(--red)" colorLight="var(--red-light)" delay={0.05} />
            <KpiCard icon={TrendingUp} value={`${r.pct_exito}%`} label="Tasa de éxito" color="var(--accent)" colorLight="var(--accent-light)" delay={0.1} />
            <KpiCard icon={Building2} value={`${r.pct_ocupacion}%`} label="Ocupación salones" color="var(--blue)" colorLight="var(--blue-light)" delay={0.15} />
            <KpiCard icon={Users} value={r.desperdicio_promedio} label="Desperdicio prom." color="var(--yellow)" colorLight="var(--yellow-light)" delay={0.2} />
            <KpiCard icon={BarChart3} value={`${r.salones_usados}/${r.total_salones}`} label="Salones usados" color="var(--accent)" colorLight="var(--accent-light)" delay={0.25} />
          </div>

          {/* ── Distribución por día ── */}
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Distribución por día</h2>
              <Badge variant="accent">{r.dia_top} es el más cargado</Badge>
            </div>
            <div style={s.dayGrid}>
              {DIAS.map((dia, i) => {
                const count = r.por_dia?.[dia] || 0
                const pct = Math.round(count / maxDia * 100)
                return (
                  <motion.div key={dia} style={s.dayCard} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
                    <div style={s.dayTop}><span style={s.dayName}>{dia}</span><span style={s.dayCount}>{count}</span></div>
                    <div style={s.barTrack}><motion.div style={s.barFill} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.2 + i * 0.06 }} /></div>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          {/* ── Insights rápidos ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            {/* Top salón y bloque */}
            <Card>
              <h2 style={s.sectionTitle}>Más utilizados</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: '1rem' }}>
                <InsightRow icon={Building2} label="Salón top" value={r.salon_top?.nombre} extra={`${r.salon_top?.usos} clases`} />
                <InsightRow icon={BarChart3} label="Bloque top" value={r.bloque_top?.nombre} extra={`${r.bloque_top?.usos} clases`} />
                <InsightRow icon={Calendar} label="Día más cargado" value={r.dia_top} extra={`${r.por_dia?.[r.dia_top] || 0} clases`} />
              </div>
            </Card>

            {/* Horarios más cargados */}
            <Card>
              <h2 style={s.sectionTitle}>Horarios más demandados</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '1rem' }}>
                {r.horarios_top && Object.entries(r.horarios_top).map(([hora, count]) => (
                  <div key={hora} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1 }}>{hora}</span>
                    <Badge variant="accent">{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Distribución por bloque ── */}
          {r.por_bloque && Object.keys(r.por_bloque).length > 0 && (
            <Card style={{ marginTop: '1.5rem' }}>
              <h2 style={s.sectionTitle}>Distribución por bloque</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: '1rem' }}>
                {Object.entries(r.por_bloque).map(([bloque, count]) => (
                  <div key={bloque} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{bloque}</span>
                    <Badge variant="blue">{count}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Progreso general ── */}
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={s.sectionHeader}>
              <div>
                <h2 style={s.sectionTitle}>Progreso general</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>
                  {r.total_asignadas} de {r.total_clases} clases asignadas
                </p>
              </div>
              <Badge variant={r.pct_exito >= 90 ? 'green' : r.pct_exito >= 70 ? 'yellow' : 'red'}>{r.pct_exito}%</Badge>
            </div>
            <div style={{ ...s.barTrack, height: 10, marginTop: '0.75rem' }}>
              <motion.div style={{ ...s.barFill, height: '100%', borderRadius: 99 }} initial={{ width: 0 }} animate={{ width: `${r.pct_exito}%` }} transition={{ duration: 1 }} />
            </div>
          </Card>

          {/* ── Diagnóstico inteligente de clases no asignadas ── */}
          {diagnostico && diagnostico.total_no_asignadas > 0 && (
            <>
              {/* Patrones detectados */}
              {diagnostico.patrones?.length > 0 && (
                <Card style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--yellow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                    <Zap size={16} style={{ color: 'var(--yellow)' }} />
                    <h2 style={s.sectionTitle}>Patrones detectados</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {diagnostico.patrones.map((p, i) => (
                      <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'var(--yellow)', flexShrink: 0 }}>•</span> {p}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {/* Diagnóstico detallado por clase */}
              <Card style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--red)' }}>
                <div style={s.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
                    <h2 style={s.sectionTitle}>Diagnóstico: clases sin asignar ({diagnostico.total_no_asignadas})</h2>
                  </div>
                </div>

                {/* Resumen de razones */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
                  {diagnostico.conteo_razones?.capacidad > 0 && <Badge variant="red">Capacidad: {diagnostico.conteo_razones.capacidad}</Badge>}
                  {diagnostico.conteo_razones?.videobeam > 0 && <Badge variant="blue">Videobeam: {diagnostico.conteo_razones.videobeam}</Badge>}
                  {diagnostico.conteo_razones?.computadores > 0 && <Badge variant="accent">Computadores: {diagnostico.conteo_razones.computadores}</Badge>}
                  {diagnostico.conteo_razones?.laboratorio > 0 && <Badge variant="yellow">Laboratorio: {diagnostico.conteo_razones.laboratorio}</Badge>}
                  {diagnostico.conteo_razones?.todos_ocupados > 0 && <Badge variant="red">Saturación: {diagnostico.conteo_razones.todos_ocupados}</Badge>}
                  {diagnostico.conteo_razones?.horario_profesor > 0 && <Badge variant="yellow">Horario prof.: {diagnostico.conteo_razones.horario_profesor}</Badge>}
                </div>

                {/* Tabla detallada */}
                <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={s.th}>Materia</th>
                        <th style={s.th}>Grupo</th>
                        <th style={s.th}>Horario</th>
                        <th style={s.th}>Est.</th>
                        <th style={s.th}>Salones compat.</th>
                        <th style={s.th}>Razón</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnostico.diagnosticos?.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-subtle)' }}>
                          <td style={s.td}>{d.materia}</td>
                          <td style={s.td}>{d.grupo}</td>
                          <td style={s.td}>{d.horario}</td>
                          <td style={s.td}>{d.estudiantes}</td>
                          <td style={s.td}>
                            <span style={{ color: d.salones_compatibles === 0 ? 'var(--red)' : 'var(--text-primary)' }}>
                              {d.salones_compatibles} ({d.salones_disponibles} libres)
                            </span>
                          </td>
                          <td style={{ ...s.td, maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.4 }}>
                            {d.razones?.map((r, j) => (
                              <span key={j} style={{ display: 'block', fontSize: '0.78rem', color: 'var(--red-text)' }}>• {r}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Recomendaciones */}
              {diagnostico.recomendaciones?.length > 0 && (
                <Card style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                    <CheckCircle size={16} style={{ color: 'var(--green)' }} />
                    <h2 style={s.sectionTitle}>Recomendaciones</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {diagnostico.recomendaciones.map((rec, i) => (
                      <p key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span> {rec}
                      </p>
                    ))}
                  </div>
                </Card>
              )}

              {/* Salones libres */}
              {diagnostico.total_salones_libres > 0 && (
                <Card style={{ marginTop: '1rem' }}>
                  <div style={s.sectionHeader}>
                    <h2 style={s.sectionTitle}>Salones sin utilizar ({diagnostico.total_salones_libres})</h2>
                    <Badge variant="yellow">Desaprovechados</Badge>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    Estos salones no fueron asignados a ninguna clase. Posiblemente no cumplen los requisitos demandados.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {diagnostico.salones_libres?.map(s => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

        </motion.div>
      ) : (
        <EmptyState isAdmin={isAdmin} onRun={handleResolver} running={running} />
      )}
    </AppLayout>
  )
}

/* ── Sub-components ── */

function KpiCard({ icon: Icon, value, label, color, colorLight, delay }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Card hover style={{ borderBottom: `3px solid ${color}` }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: colorLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color, marginBottom: '0.75rem' }}>
          <Icon size={17} />
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 5, fontWeight: 500 }}>{label}</div>
      </Card>
    </motion.div>
  )
}

function InsightRow({ icon: Icon, label, value, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
        <Icon size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value || '—'}</div>
      </div>
      {extra && <Badge variant="default">{extra}</Badge>}
    </div>
  )
}

function EmptyState({ isAdmin, onRun, running }) {
  return (
    <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <motion.div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.8rem' }} animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>🏫</motion.div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Sin datos aún</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {isAdmin ? 'Ejecuta el solver para generar las asignaciones.' : 'Espera a que un administrador ejecute el solver.'}
      </p>
      {isAdmin && <Button icon={<Play size={15} />} loading={running} onClick={onRun} variant="yellow">Ejecutar Solver</Button>}
    </Card>
  )
}

const s = {
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 },
  pageSub: { color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  select: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', fontFamily: 'inherit', cursor: 'pointer' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '1rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' },
  dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' },
  dayCard: { background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', border: '1px solid var(--border)' },
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayName: { fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dayCount: { fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' },
  barTrack: { height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--yellow))', borderRadius: 99 },
  th: { padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  td: { padding: '8px 12px', color: 'var(--text-primary)', fontSize: '0.82rem' },
}
