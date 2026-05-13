import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, BookOpen, User, Clock, Users, Monitor, FlaskConical, Projector } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Loader from '../components/ui/Loader'
import { generarClasesIA } from '../services/api'

const EJEMPLOS = [
  'Crea 5 grupos de Cálculo I con 30 estudiantes, profesor Juan Pérez, horario 7:00–9:00',
  'Genera 3 clases de Programación con laboratorio, 25 estudiantes, profesora María López, 14:00–16:00',
  'Necesito 2 grupos de Física con videobeam, 40 estudiantes, tipo planta, horario 10:00–12:00',
]

export default function AsistenteIA() {
  const [prompt, setPrompt]       = useState('')
  const [clases, setClases]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [alert, setAlert]         = useState(null)

  const handleGenerar = async () => {
    if (!prompt.trim()) {
      setAlert({ type: 'error', message: 'Escribe una descripción de las clases que quieres generar.' })
      return
    }

    setLoading(true)
    setAlert(null)
    setClases([])

    try {
      const res = await generarClasesIA(prompt.trim())
      setClases(res.data.clases || [])
      if (res.data.clases?.length > 0) {
        setAlert({ type: 'success', message: `Se generaron ${res.data.total} clases correctamente.` })
      } else {
        setAlert({ type: 'warning', message: 'La IA no generó clases. Intenta con un prompt más específico.' })
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al conectar con el servicio de IA.'
      setAlert({ type: 'error', message: detail })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={s.iconWrap}><Sparkles size={18} /></div>
          <div>
            <h1 style={s.title}>Asistente IA</h1>
            <p style={s.sub}>Genera datasets de clases automáticamente con inteligencia artificial</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <label style={s.label}>Describe las clases que necesitas</label>
        <div style={s.inputRow}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ej: Crea 5 grupos de Arquitectura de Software con 20 estudiantes cada uno, profesora Alexa Galeano, horario 6:00–7:30"
            rows={3}
            style={s.textarea}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerar() } }}
          />
          <Button
            onClick={handleGenerar}
            loading={loading}
            disabled={!prompt.trim()}
            icon={<Send size={15} />}
          >
            Generar
          </Button>
        </div>

        {/* Ejemplos rápidos */}
        <div style={s.ejemplos}>
          <span style={s.ejemplosLabel}>Ejemplos:</span>
          {EJEMPLOS.map((ej, i) => (
            <button
              key={i}
              onClick={() => setPrompt(ej)}
              style={s.ejemploBtn}
            >
              {ej.substring(0, 50)}...
            </button>
          ))}
        </div>
      </Card>

      {/* Alert */}
      {alert && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* Loading */}
      {loading && <Loader text="Generando clases con IA..." />}

      {/* Resultados */}
      <AnimatePresence>
        {clases.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={s.resultHeader}>
              <h2 style={s.resultTitle}>Clases generadas ({clases.length})</h2>
              <Badge variant="green">{clases.length} registros</Badge>
            </div>

            <div style={s.grid}>
              {clases.map((clase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card hover style={{ borderLeft: '3px solid var(--accent)' }}>
                    <div style={s.cardHeader}>
                      <BookOpen size={14} style={{ color: 'var(--accent)' }} />
                      <span style={s.cardMateria}>{clase.materia || '—'}</span>
                      <Badge variant="default">{clase.grupo || '—'}</Badge>
                    </div>

                    <div style={s.cardBody}>
                      <div style={s.cardRow}>
                        <User size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{clase.profesor || '—'}</span>
                        <Badge variant="accent">{clase.tipo_profesor || '—'}</Badge>
                      </div>
                      <div style={s.cardRow}>
                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{clase.horario || '—'}</span>
                      </div>
                      <div style={s.cardRow}>
                        <Users size={12} style={{ color: 'var(--text-muted)' }} />
                        <span>{clase.estudiantes} estudiantes</span>
                      </div>
                    </div>

                    {/* Requisitos */}
                    <div style={s.cardReqs}>
                      {clase.requiere_videobeam && <Badge variant="blue"><Projector size={10} /> VB</Badge>}
                      {clase.requiere_computadores && <Badge variant="yellow"><Monitor size={10} /> PC</Badge>}
                      {clase.requiere_laboratorio && <Badge variant="green"><FlaskConical size={10} /> Lab</Badge>}
                      {!clase.requiere_videobeam && !clase.requiere_computadores && !clase.requiere_laboratorio && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sin requisitos especiales</span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  )
}

const s = {
  header: { marginBottom: '1.5rem' },
  iconWrap: { width: 38, height: 38, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 },
  sub: { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', marginBottom: 8, display: 'block' },
  inputRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textarea: {
    flex: 1, background: 'var(--bg)', border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 14px',
    color: 'var(--text-primary)', fontSize: '0.9rem', fontFamily: 'inherit',
    resize: 'vertical', outline: 'none', transition: 'border-color var(--transition)',
    minHeight: 70,
  },
  ejemplos: { display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  ejemplosLabel: { fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 },
  ejemploBtn: {
    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '3px 8px',
    fontSize: '0.7rem', color: 'var(--text-secondary)',
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all var(--transition)',
  },
  resultHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' },
  resultTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardMateria: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  cardRow: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: 'var(--text-secondary)' },
  cardReqs: { display: 'flex', gap: 4, paddingTop: 8, borderTop: '1px solid var(--border)' },
}
