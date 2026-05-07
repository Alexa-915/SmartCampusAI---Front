import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Calendar, TrendingUp, Building2, Play, RefreshCw } from 'lucide-react'
import { getResumen, resolverCSP, getDatasets } from '../services/api'
import { useAuth } from '../context/AuthContext'
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
  const [datasetId, setDatasetId]   = useState(null)

  const { usuario } = useAuth()
  const isAdmin = usuario?.rol === 'admin'

  // Cargar datasets al montar y seleccionar el primero
  useEffect(() => {
    getDatasets()
      .then(res => {
        setDatasets(res.data)
        if (res.data.length > 0) {
          setDatasetId(res.data[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        setAlert({ type: 'error', message: 'No se pudo conectar con el servidor.' })
        setLoading(false)
      })
  }, [])

  // Cuando cambia el dataset seleccionado, cargar su resumen
  useEffect(() => {
    if (!datasetId) return
    fetchResumen(datasetId)
  }, [datasetId])

  const fetchResumen = (id) => {
    setLoading(true)
    getResumen(id)
      .then(res => setResumen(res.data))
      .catch(() => setResumen(null))
      .finally(() => setLoading(false))
  }

  const handleResolver = async () => {
    if (!datasetId) {
      setAlert({ type: 'error', message: 'No hay dataset seleccionado. Ve a Datos y crea uno primero.' })
      return
    }
    setRunning(true)
    setAlert(null)
    try {
      const res = await resolverCSP(datasetId)
      setAlert({
        type: 'success',
        message: `Solver completado — ${res.data.asignadas} asignadas, ${res.data.no_asignadas} sin asignar (${res.data.pct_exito}% éxito)`,
      })
      fetchResumen(datasetId)
    } catch {
      setAlert({ type: 'error', message: 'Error al ejecutar el solver. Verifica que el dataset tenga clases y salones cargados.' })
    } finally {
      setRunning(false)
    }
  }

  const maxDia = resumen ? Math.max(...DIAS.map(d => resumen.por_dia?.[d] || 0), 1) : 1
  const pctExito = resumen?.total_asignadas ? Math.round(resumen.total_asignadas / Math.max(resumen.total_asignadas, 1) * 100) : 0

  return (
    <AppLayout>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.pageTitle}>Panel de Control</h1>
          <p style={s.pageSub}>
            Bienvenido, <strong>{usuario?.nombre || 'usuario'}</strong> —{' '}
            <Badge variant={isAdmin ? 'accent' : 'default'}>{usuario?.rol || 'viewer'}</Badge>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Selector de dataset */}
          {datasets.length > 0 && (
            <select
              value={datasetId || ''}
              onChange={e => setDatasetId(Number(e.target.value))}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '6px 10px',
                fontSize: '0.8rem', color: 'var(--text-primary)',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.nombre}</option>
              ))}
            </select>
          )}
          <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={() => fetchResumen(datasetId)}>
            Actualizar
          </Button>
          {isAdmin && (
            <Button
              variant="yellow"
              size="sm"
              icon={<Play size={14} />}
              loading={running}
              onClick={handleResolver}
            >
              Ejecutar Solver
            </Button>
          )}
        </div>
      </div>

      {/* Alert */}
      <div style={{ marginBottom: alert ? '1.5rem' : 0 }}>
        <Alert
          type={alert?.type}
          message={alert?.message}
          onClose={() => setAlert(null)}
        />
      </div>

      {loading ? (
        <Loader text="Cargando datos del servidor..." />
      ) : resumen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* KPIs */}
          <div style={s.kpiGrid}>
            <KpiCard
              icon={CheckCircle}
              value={resumen.total_asignadas}
              label="Clases asignadas"
              color="var(--green)"
              colorLight="var(--green-light)"
              colorText="var(--green-text)"
              delay={0}
            />
            <KpiCard
              icon={TrendingUp}
              value={`${pctExito}%`}
              label="Tasa de éxito"
              color="var(--accent)"
              colorLight="var(--accent-light)"
              colorText="var(--accent-text)"
              delay={0.05}
            />
            <KpiCard
              icon={Calendar}
              value={DIAS.reduce((a, d) => a + (resumen.por_dia?.[d] || 0), 0)}
              label="Clases en semana"
              color="var(--yellow)"
              colorLight="var(--yellow-light)"
              colorText="var(--yellow-text)"
              delay={0.1}
            />
            <KpiCard
              icon={Building2}
              value={DIAS.filter(d => (resumen.por_dia?.[d] || 0) > 0).length}
              label="Días con clases"
              color="var(--blue)"
              colorLight="var(--blue-light)"
              colorText="var(--blue-text)"
              delay={0.15}
            />
          </div>

          {/* Distribución por día */}
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={s.sectionHeader}>
              <h2 style={s.sectionTitle}>Distribución por día</h2>
              <Badge variant="default">{resumen.total_asignadas} total</Badge>
            </div>

            <div style={s.dayGrid}>
              {DIAS.map((dia, i) => {
                const count = resumen.por_dia?.[dia] || 0
                const pct   = Math.round(count / maxDia * 100)
                return (
                  <motion.div
                    key={dia}
                    style={s.dayCard}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.07 }}
                  >
                    <div style={s.dayTop}>
                      <span style={s.dayName}>{dia}</span>
                      <span style={s.dayCount}>{count}</span>
                    </div>
                    <div style={s.barTrack}>
                      <motion.div
                        style={s.barFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.07, ease: 'easeOut' }}
                      />
                    </div>
                    <span style={s.dayPct}>{pct}% del máximo</span>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          {/* Barra de progreso general */}
          <Card style={{ marginTop: '1rem' }}>
            <div style={s.sectionHeader}>
              <div>
                <h2 style={s.sectionTitle}>Progreso general del solver</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>
                  {resumen.total_asignadas} de 329 clases asignadas
                </p>
              </div>
              <Badge variant={pctExito >= 90 ? 'green' : pctExito >= 70 ? 'yellow' : 'red'}>
                {pctExito}%
              </Badge>
            </div>
            <div style={{ ...s.barTrack, height: 10, marginTop: '0.75rem' }}>
              <motion.div
                style={{ ...s.barFill, height: '100%', borderRadius: 99 }}
                initial={{ width: 0 }}
                animate={{ width: `${pctExito}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </Card>
        </motion.div>
      ) : (
        <EmptyState isAdmin={isAdmin} onRun={handleResolver} running={running} />
      )}
    </AppLayout>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function KpiCard({ icon: Icon, value, label, color, colorLight, colorText, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card hover style={{ borderBottom: `3px solid ${color}` }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: colorLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, marginBottom: '1rem',
        }}>
          <Icon size={18} />
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6, fontWeight: 500 }}>
          {label}
        </div>
      </Card>
    </motion.div>
  )
}

function EmptyState({ isAdmin, onRun, running }) {
  return (
    <Card style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <motion.div
        style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'var(--bg-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '1.8rem',
        }}
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🏫
      </motion.div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        Sin datos aún
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {isAdmin
          ? 'Ejecuta el solver para generar las asignaciones de salones.'
          : 'Espera a que un administrador ejecute el solver.'}
      </p>
      {isAdmin && (
        <Button icon={<Play size={15} />} loading={running} onClick={onRun} variant="yellow">
          Ejecutar Solver ahora
        </Button>
      )}
    </Card>
  )
}

const s = {
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem',
  },
  pageTitle: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 },
  pageSub: { color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8,
  },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' },
  dayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  },
  dayCard: {
    background: 'var(--bg-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '1rem',
    border: '1px solid var(--border)',
  },
  dayTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayName: { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  dayCount: { fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' },
  barTrack: { height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' },
  barFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent), var(--yellow))',
    borderRadius: 99,
  },
  dayPct: { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, display: 'block' },
}
