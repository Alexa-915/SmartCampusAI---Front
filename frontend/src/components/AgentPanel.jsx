import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertTriangle, CheckCircle, XCircle, Send, BarChart3, Users, Building2, Cpu, Info, Brain } from 'lucide-react'
import { analizarDataset, chatAgente } from '../services/agentService'
import Card from './ui/Card'
import Badge from './ui/Badge'
import Button from './ui/Button'

export default function AgentPanel({ datasetId, onNavigateToClase }) {
  const [analisis, setAnalisis]   = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [pregunta, setPregunta]   = useState('')
  const [historial, setHistorial] = useState([])
  const [enviando, setEnviando]   = useState(false)
  const [error, setError]         = useState(null)
  const chatEndRef                = useRef(null)

  // Auto-scroll del chat
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
  }, [historial, enviando])

  async function ejecutarAnalisis() {
    setCargando(true)
    setError(null)
    try {
      const data = await analizarDataset(datasetId)
      setAnalisis(data)
      setHistorial([])
    } catch (e) {
      setError('No se pudo analizar el dataset. Verifica que tenga clases y salones cargados.')
    } finally {
      setCargando(false)
    }
  }

  async function enviarPregunta(e) {
    e.preventDefault()
    if (!pregunta.trim()) return
    setEnviando(true)
    const preguntaActual = pregunta
    setPregunta('')
    try {
      const data = await chatAgente(datasetId, preguntaActual, historial)
      setHistorial(data.historial)
    } catch {
      setHistorial(h => [...h,
        { role: 'user', content: preguntaActual },
        { role: 'assistant', content: 'No se pudo conectar con ClassMind en este momento.' }
      ])
    } finally {
      setEnviando(false)
    }
  }

  const m = analisis?.metricas

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerIcon}>
              <Brain size={18} />
            </div>
            <div>
              <h3 style={s.headerTitle}>ClassMind</h3>
              <p style={s.headerSub}>Inteligencia académica para optimización de horarios</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={ejecutarAnalisis}
            loading={cargando}
            variant={analisis ? 'secondary' : 'primary'}
          >
            {analisis ? 'Re-analizar' : 'Analizar dataset'}
          </Button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={s.errorBanner}>
              <XCircle size={14} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading análisis */}
        {cargando && (
          <div style={s.loadingWrap}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={s.loadingRing}
            />
            <div>
              <p style={s.loadingTitle}>ClassMind está analizando</p>
              <p style={s.loadingText}>Evaluando viabilidad académica del dataset...</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {analisis && !cargando && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={s.body}>

            {/* Score + KPIs */}
            <div style={s.kpiRow}>
              <ScoreRing score={m?.score} nivel={m?.nivel_viabilidad} />
              <KpiMini icon={Users} label="Clases" value={m?.total_clases} />
              <KpiMini icon={Building2} label="Salones" value={m?.total_salones} />
              <KpiMini icon={XCircle} label="Sin salón" value={m?.clases_sin_salon?.length || 0} color={m?.clases_sin_salon?.length > 0 ? 'var(--red)' : null} />
              <KpiMini icon={AlertTriangle} label="Carga imp." value={m?.carga_imposible?.length || 0} color={m?.carga_imposible?.length > 0 ? 'var(--yellow)' : null} />
              <KpiMini icon={Cpu} label="Hor. inválidos" value={m?.horarios_invalidos?.length || 0} color={m?.horarios_invalidos?.length > 0 ? 'var(--red)' : null} />
            </div>

            {/* Mensaje de nivel */}
            {m?.mensaje_nivel && (
              <div style={{ ...s.nivelBanner, borderLeftColor: m.nivel_viabilidad === 'alto' ? 'var(--green)' : m.nivel_viabilidad === 'medio' ? 'var(--yellow)' : 'var(--red)' }}>
                <Info size={14} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                <span>{m.mensaje_nivel}</span>
              </div>
            )}

            {/* Resumen IA */}
            {analisis.recomendaciones?.resumen && (
              <div style={s.resumenIA}>
                <Sparkles size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>{analisis.recomendaciones.resumen}</span>
              </div>
            )}

            {/* Recomendaciones */}
            {analisis.recomendaciones?.recomendaciones?.length > 0 && (
              <div style={s.recsSection}>
                <p style={s.sectionLabel}>Recomendaciones</p>
                <div style={s.recsGrid}>
                  {analisis.recomendaciones.recomendaciones.map((rec, i) => (
                    <RecCard key={i} rec={rec} />
                  ))}
                </div>
              </div>
            )}

            {/* Conflictos */}
            {(m?.clases_sin_salon?.length > 0 || m?.carga_imposible?.length > 0 || m?.insuficiencia_recursos?.length > 0 || m?.horarios_invalidos?.length > 0) && (
              <div style={s.conflictsSection}>
                <p style={s.sectionLabel}>Conflictos detectados</p>
                {m.horarios_invalidos?.map((c, i) => (
                  <ConflictRow key={`hor-${i}`} tipo="critico" texto={c.explicacion} materia={c.materia} grupo={c.grupo} onClick={onNavigateToClase} />
                ))}
                {m.clases_sin_salon?.map((c, i) => (
                  <ConflictRow key={`cap-${i}`} tipo="critico" texto={`${c.materia} (${c.grupo}): ${c.razon}`} materia={c.materia} grupo={c.grupo} onClick={onNavigateToClase} />
                ))}
                {m.carga_imposible?.map((c, i) => (
                  <ConflictRow key={`carga-${i}`} tipo="advertencia" texto={c.explicacion} />
                ))}
                {m.insuficiencia_recursos?.map((c, i) => (
                  <ConflictRow key={`rec-${i}`} tipo="advertencia" texto={c.explicacion} />
                ))}
              </div>
            )}

            {/* ═══ CHAT ═══ */}
            <div style={s.chatWrapper}>
              <div style={s.chatHeader}>
                <Brain size={14} style={{ color: 'var(--accent)' }} />
                <span style={s.chatHeaderText}>Pregunta a ClassMind</span>
              </div>

              <div style={s.chatBody}>
                {historial.length === 0 && !enviando && (
                  <div style={s.chatEmpty}>
                    <p style={s.chatEmptyText}>Haz preguntas sobre tu dataset. ClassMind analizará los datos y te dará respuestas contextuales.</p>
                  </div>
                )}

                {historial.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={msg.role === 'user' ? s.msgUser : s.msgAssistant}
                  >
                    {msg.role === 'assistant' && <Brain size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />}
                    <span>{limpiarTexto(msg.content)}</span>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {enviando && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.msgAssistant}>
                    <Brain size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <div style={s.typingDots}>
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }} style={s.dot} />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} style={s.dot} />
                      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} style={s.dot} />
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={enviarPregunta} style={s.chatForm}>
                <input
                  type="text"
                  value={pregunta}
                  onChange={e => setPregunta(e.target.value)}
                  placeholder="Ej: ¿Qué clases tienen más riesgo de no asignarse?"
                  disabled={enviando}
                  style={s.chatInput}
                />
                <button
                  type="submit"
                  disabled={enviando || !pregunta.trim()}
                  style={{ ...s.chatSend, opacity: pregunta.trim() && !enviando ? 1 : 0.4 }}
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-componentes ── */

function ScoreRing({ score = 0, nivel }) {
  const color = nivel === 'alto' ? 'var(--green)' : nivel === 'medio' ? 'var(--yellow)' : 'var(--red)'
  const circumference = 2 * Math.PI * 28
  const offset = circumference - (score / 100) * circumference
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <svg width="68" height="68" style={{ display: 'block' }}>
        <circle cx="34" cy="34" r="28" fill="none" stroke="var(--border)" strokeWidth="5" />
        <circle cx="34" cy="34" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 34 34)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="34" y="37" textAnchor="middle" style={{ fontSize: '14px', fontWeight: 800, fill: 'var(--text-primary)' }}>{score}</text>
      </svg>
      <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', display: 'block' }}>Viabilidad</span>
    </div>
  )
}

function KpiMini({ icon: Icon, label, value, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <Icon size={13} style={{ color: color || 'var(--text-muted)', marginBottom: 3 }} />
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value ?? 0}</div>
      <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

function RecCard({ rec }) {
  const colors = {
    critico:     { bg: 'var(--red-light)', border: 'var(--red)', icon: XCircle, color: 'var(--red-text)' },
    advertencia: { bg: 'var(--yellow-light)', border: 'var(--yellow)', icon: AlertTriangle, color: 'var(--yellow-text)' },
    info:        { bg: 'var(--blue-light)', border: 'var(--blue)', icon: Info, color: 'var(--blue-text)' },
  }
  const c = colors[rec.tipo] || colors.info
  const Icon = c.icon
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={13} style={{ color: c.color }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: c.color }}>{rec.titulo}</span>
      </div>
      <p style={{ fontSize: '0.75rem', color: c.color, opacity: 0.85, lineHeight: 1.4, margin: 0 }}>{rec.descripcion}</p>
    </div>
  )
}

function ConflictRow({ tipo, texto, materia, grupo, onClick }) {
  const color = tipo === 'critico' ? 'var(--red)' : 'var(--yellow)'
  const clickable = !!(materia && onClick)
  return (
    <div
      onClick={clickable ? () => onClick(materia, grupo) : undefined}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 6px', borderBottom: '1px solid var(--border)', borderRadius: 4, cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, flex: 1 }}>{texto}</span>
      {clickable && <span style={{ fontSize: '0.63rem', color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>Ir →</span>}
    </div>
  )
}

function limpiarTexto(texto) {
  if (!texto) return ''
  return texto.replace(/###\s*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/```[\s\S]*?```/g, '').trim()
}

/* ── Estilos ── */
const s = {
  wrapper: { margin: '2rem 0', position: 'relative' },
  container: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-card) 100%)' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 2px 10px var(--accent-glow)' },
  headerTitle: { fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' },
  headerSub: { fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 },
  errorBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 1.5rem', background: 'var(--red-light)', color: 'var(--red-text)', fontSize: '0.82rem', borderBottom: '1px solid var(--red)' },
  loadingWrap: { display: 'flex', alignItems: 'center', gap: 14, padding: '2.5rem 1.5rem', justifyContent: 'center' },
  loadingRing: { width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', flexShrink: 0 },
  loadingTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  loadingText: { fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' },
  body: { padding: '1.25rem 1.5rem' },
  kpiRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem', padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' },
  nivelBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', borderLeft: '4px solid var(--accent)', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' },
  resumenIA: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--accent-text)', lineHeight: 1.5 },
  sectionLabel: { fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 },
  recsSection: { marginBottom: '1.25rem' },
  recsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  conflictsSection: { marginBottom: '1.5rem' },

  // Chat — diseño premium
  chatWrapper: { borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '1rem' },
  chatHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' },
  chatHeaderText: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' },
  chatBody: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', minHeight: 80, maxHeight: 260, overflowY: 'auto', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: 10 },
  chatEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 60 },
  chatEmptyText: { fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: 300 },
  msgUser: { alignSelf: 'flex-end', background: 'var(--accent)', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 14px', maxWidth: '80%', fontSize: '0.8rem', lineHeight: 1.5 },
  msgAssistant: { alignSelf: 'flex-start', display: 'flex', alignItems: 'flex-start', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', padding: '8px 14px', maxWidth: '85%', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--text-secondary)' },
  typingDots: { display: 'flex', gap: 3, alignItems: 'center', padding: '4px 0' },
  dot: { width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'block' },
  chatForm: { display: 'flex', gap: 8 },
  chatInput: { flex: 1, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: '0.82rem', fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-card)', outline: 'none', transition: 'border-color var(--transition), box-shadow var(--transition)' },
  chatSend: { width: 38, height: 38, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--gradient-accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity var(--transition)', boxShadow: '0 2px 8px var(--accent-glow)', flexShrink: 0 },
}
