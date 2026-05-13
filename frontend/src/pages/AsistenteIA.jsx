import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, FileUp, Sparkles, BookOpen, User, Clock, Users, Monitor, FlaskConical, Projector, ArrowUp, Save, Pencil, Check, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Select from '../components/ui/Select'
import { useDataset } from '../context/DatasetContext'
import { generarClasesIA, extraerTextoPDF, getDatasets, crearClase } from '../services/api'

const SUGERENCIAS = [
  { icon: BookOpen, text: 'Crea 5 grupos de programación' },
  { icon: Users, text: 'Genera clases de cálculo con 30 estudiantes' },
  { icon: Clock, text: 'Necesito grupos nocturnos de bases de datos' },
  { icon: Monitor, text: 'Crea clases con laboratorio de computadores' },
]

export default function AsistenteIA() {
  const { refrescarTodo } = useDataset()

  // Cargar mensajes desde localStorage al montar
  const [prompt, setPrompt]         = useState('')
  const [mensajes, setMensajes]     = useState(() => {
    try {
      const saved = localStorage.getItem('ia_chat_mensajes')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [loading, setLoading]       = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')  // mensaje de loading dinámico
  const [alert, setAlert]           = useState(null)
  const chatRef                     = useRef(null)
  const textareaRef                 = useRef(null)

  // Persistir mensajes en localStorage cada vez que cambian
  useEffect(() => {
    try {
      localStorage.setItem('ia_chat_mensajes', JSON.stringify(mensajes))
    } catch { /* localStorage lleno, ignorar */ }
  }, [mensajes])

  // Estado para guardar en dataset
  const [modalGuardar, setModalGuardar]   = useState(false)
  const [datasets, setDatasets]           = useState([])
  const [datasetSeleccionado, setDatasetSeleccionado] = useState('')
  const [guardando, setGuardando]         = useState(false)
  const [clasesParaGuardar, setClasesParaGuardar]     = useState([])

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [mensajes, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px'
    }
  }, [prompt])

  const handleEnviar = async () => {
    if (!prompt.trim() || loading) return
    const textoUsuario = prompt.trim()
    setPrompt('')
    setMensajes(prev => [...prev, { rol: 'user', texto: textoUsuario }])
    setLoading(true)
    setLoadingMsg('Generando clases...')
    try {
      const res = await generarClasesIA(textoUsuario)
      const clasesConId = (res.data.clases || []).map((c, i) => ({ ...c, _id: Date.now() + i, _editando: false }))
      setMensajes(prev => [...prev, { rol: 'ia', clases: clasesConId, total: res.data.total }])
    } catch (err) {
      setMensajes(prev => [...prev, { rol: 'ia', error: err.response?.data?.detail || 'Error al conectar con la IA.' }])
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return
    setLoadingPDF(true)
    setLoadingMsg('Procesando PDF...')
    try {
      const res = await extraerTextoPDF(file)
      setPrompt(res.data.texto)
      setAlert({ type: 'success', message: `Texto extraído (${res.data.caracteres} caracteres). Revisa y presiona enviar.` })
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al leer el PDF' })
    } finally {
      setLoadingPDF(false)
      setLoadingMsg('')
      e.target.value = ''
    }
  }

  // Editar una clase dentro de un mensaje
  const actualizarClase = (msgIdx, claseId, campo, valor) => {
    setMensajes(prev => prev.map((msg, i) => {
      if (i !== msgIdx || msg.rol !== 'ia') return msg
      return {
        ...msg,
        clases: msg.clases.map(c => c._id === claseId ? { ...c, [campo]: valor } : c)
      }
    }))
  }

  const toggleEditar = (msgIdx, claseId) => {
    setMensajes(prev => prev.map((msg, i) => {
      if (i !== msgIdx || msg.rol !== 'ia') return msg
      return {
        ...msg,
        clases: msg.clases.map(c => c._id === claseId ? { ...c, _editando: !c._editando } : c)
      }
    }))
  }

  // Abrir modal para guardar clases de un mensaje
  const abrirGuardar = async (clases) => {
    setClasesParaGuardar(clases)
    setModalGuardar(true)
    try {
      const res = await getDatasets()
      setDatasets(res.data)
      if (res.data.length > 0) setDatasetSeleccionado(String(res.data[0].id))
    } catch { setDatasets([]) }
  }

  // Guardar clases en el dataset seleccionado
  const confirmarGuardar = async () => {
    if (!datasetSeleccionado) return
    setGuardando(true)
    try {
      let guardadas = 0
      for (const clase of clasesParaGuardar) {
        await crearClase({
          dataset_id: parseInt(datasetSeleccionado),
          materia: clase.materia || '',
          grupo: clase.grupo || '',
          profesor: clase.profesor || '',
          tipo: clase.tipo_profesor || 'Catedrático',
          horario: clase.horario || '',
          estudiantes: parseInt(clase.estudiantes) || 0,
          requiere_videobeam: !!clase.requiere_videobeam,
          requiere_computadores: !!clase.requiere_computadores,
          requiere_laboratorio: !!clase.requiere_laboratorio,
        })
        guardadas++
      }
      setModalGuardar(false)
      setAlert({ type: 'success', message: `${guardadas} clases guardadas en el dataset. Ve a Datos para verlas.` })
      // Refrescar el contexto global para que Datos muestre las nuevas clases
      await refrescarTodo()
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al guardar las clases' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AppLayout>
      <div style={s.container}>
        {/* Header */}
        <div style={{ ...s.header, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.headerIcon}><Sparkles size={18} /></div>
            <div>
              <h1 style={s.title}>Asistente IA</h1>
              <p style={s.sub}>Genera datasets de clases con inteligencia artificial</p>
            </div>
          </div>
          {mensajes.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => { setMensajes([]); localStorage.removeItem('ia_chat_mensajes') }}>
              Nuevo chat
            </Button>
          )}
        </div>

        {alert && <div style={{ marginBottom: '1rem' }}><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

        {/* Chat area */}
        <div ref={chatRef} style={s.chatArea}>
          {mensajes.length === 0 && !loading ? (
            <div style={s.emptyState}>
              <p style={s.emptyTitle2}>Genera clases automáticamente</p>
              <p style={s.emptyText}>Describe las clases que necesitas en lenguaje natural. No necesitas escribir toda la información exacta — luego puedes editar las tarjetas generadas.</p>
              <div style={s.sugGrid}>
                {SUGERENCIAS.map(({ icon: Icon, text }, i) => (
                  <button key={i} onClick={() => setPrompt(text)} style={s.sugCard}>
                    <Icon size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span>{text}</span>
                  </button>
                ))}
              </div>
              <p style={s.helpText}>
                El asistente puede generar: materias, grupos, profesores, horarios, estudiantes y requerimientos especiales. Luego puedes editar cualquier dato manualmente.
              </p>
            </div>
          ) : (
            <div style={s.mensajes}>
              {mensajes.map((msg, msgIdx) => (
                <motion.div key={msgIdx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={msg.rol === 'user' ? s.msgUser : s.msgIA}>
                  {msg.rol === 'user' ? (
                    <div style={s.bubbleUser}>{msg.texto}</div>
                  ) : msg.error ? (
                    <div style={s.bubbleError}>{msg.error}</div>
                  ) : (
                    <div style={s.bubbleIA}>
                      <div style={s.iaTop}>
                        <span style={s.iaHeader}>{msg.total} clases generadas</span>
                        <Button size="sm" variant="secondary" icon={<Save size={13} />} onClick={() => abrirGuardar(msg.clases)}>
                          Guardar en Dataset
                        </Button>
                      </div>
                      <div style={s.clasesGrid}>
                        {msg.clases?.map(c => (
                          <ClaseCardEditable
                            key={c._id}
                            clase={c}
                            onEdit={(campo, valor) => actualizarClase(msgIdx, c._id, campo, valor)}
                            onToggleEdit={() => toggleEditar(msgIdx, c._id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={s.msgIA}>
                  <div style={s.bubbleIA}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={s.typing}><span /><span /><span /></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{loadingMsg}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={s.inputArea}>
          <div style={s.inputContainer}>
            <label style={s.clipBtn} title="Subir PDF">
              <input type="file" accept=".pdf" onChange={handlePDF} style={{ display: 'none' }} />
              <FileUp size={16} />
            </label>
            <textarea
              ref={textareaRef}
              value={loadingPDF ? 'Extrayendo texto del PDF...' : prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() } }}
              placeholder="Describe las clases que necesitas..."
              rows={1}
              disabled={loadingPDF}
              style={s.textarea}
            />
            <button onClick={handleEnviar} disabled={!prompt.trim() || loading} style={{ ...s.sendBtn, opacity: prompt.trim() && !loading ? 1 : 0.4, background: prompt.trim() ? 'var(--accent)' : 'var(--border)' }}>
              <ArrowUp size={15} style={{ color: prompt.trim() ? '#fff' : 'var(--text-muted)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal guardar en dataset */}
      <Modal open={modalGuardar} onClose={() => setModalGuardar(false)} title="Guardar clases en dataset" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Se guardarán <strong>{clasesParaGuardar.length}</strong> clases en el dataset seleccionado.
          </p>
          <Select
            label="Dataset destino"
            value={datasetSeleccionado}
            onChange={setDatasetSeleccionado}
            options={datasets.map(d => ({ value: String(d.id), label: d.nombre }))}
            placeholder="Selecciona un dataset..."
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalGuardar(false)}>Cancelar</Button>
            <Button onClick={confirmarGuardar} loading={guardando} disabled={!datasetSeleccionado}>Guardar clases</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}

// ── Card editable ──
function ClaseCardEditable({ clase, onEdit, onToggleEdit }) {
  const ed = clase._editando

  return (
    <div style={{ ...s.claseCard, borderColor: ed ? 'var(--accent)' : 'var(--border)' }}>
      <div style={s.claseTop}>
        {ed ? (
          <input value={clase.materia} onChange={e => onEdit('materia', e.target.value)} style={s.editInput} placeholder="Materia" />
        ) : (
          <span style={s.claseMateria}>{clase.materia || '—'}</span>
        )}
        <button onClick={onToggleEdit} style={s.editBtn} title={ed ? 'Listo' : 'Editar'}>
          {ed ? <Check size={12} /> : <Pencil size={12} />}
        </button>
      </div>

      {ed ? (
        <div style={s.editGrid}>
          <input value={clase.grupo} onChange={e => onEdit('grupo', e.target.value)} style={s.editInput} placeholder="Grupo" />
          <input value={clase.profesor} onChange={e => onEdit('profesor', e.target.value)} style={s.editInput} placeholder="Profesor" />
          <input value={clase.horario} onChange={e => onEdit('horario', e.target.value)} style={s.editInput} placeholder="Horario" />
          <input value={clase.estudiantes} onChange={e => onEdit('estudiantes', e.target.value)} style={s.editInput} placeholder="Estudiantes" type="number" />
          <select value={clase.tipo_profesor} onChange={e => onEdit('tipo_profesor', e.target.value)} style={s.editInput}>
            <option value="Planta">Planta</option>
            <option value="Catedrático">Catedrático</option>
          </select>
          <div style={{ display: 'flex', gap: 8, gridColumn: '1 / -1' }}>
            <label style={s.checkLabel}><input type="checkbox" checked={!!clase.requiere_videobeam} onChange={e => onEdit('requiere_videobeam', e.target.checked)} /> VB</label>
            <label style={s.checkLabel}><input type="checkbox" checked={!!clase.requiere_computadores} onChange={e => onEdit('requiere_computadores', e.target.checked)} /> PC</label>
            <label style={s.checkLabel}><input type="checkbox" checked={!!clase.requiere_laboratorio} onChange={e => onEdit('requiere_laboratorio', e.target.checked)} /> Lab</label>
          </div>
        </div>
      ) : (
        <>
          <div style={s.claseBody}>
            <span><User size={11} /> {clase.profesor || '—'} · <Badge variant="accent">{clase.tipo_profesor}</Badge></span>
            <span><Clock size={11} /> {clase.horario || '—'} · <Users size={11} /> {clase.estudiantes} est.</span>
          </div>
          <div style={s.claseReqs}>
            {clase.grupo && <Badge variant="default">{clase.grupo}</Badge>}
            {clase.requiere_videobeam && <Badge variant="blue">VB</Badge>}
            {clase.requiere_computadores && <Badge variant="yellow">PC</Badge>}
            {clase.requiere_laboratorio && <Badge variant="green">Lab</Badge>}
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  container: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexShrink: 0 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' },
  title: { fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 },
  sub: { fontSize: '0.85rem', color: 'var(--text-muted)' },

  chatArea: { flex: 1, overflowY: 'auto', paddingBottom: '1rem' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', textAlign: 'center' },
  emptyText: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 420, lineHeight: 1.5 },
  emptyTitle2: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 },
  helpText: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1.25rem', maxWidth: 420, textAlign: 'center', lineHeight: 1.5 },
  sugGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 500 },
  sugCard: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'left', transition: 'all 0.15s', lineHeight: 1.4 },

  mensajes: { display: 'flex', flexDirection: 'column', gap: 14 },
  msgUser: { display: 'flex', justifyContent: 'flex-end' },
  msgIA: { display: 'flex', justifyContent: 'flex-start' },
  bubbleUser: { background: 'var(--accent)', color: '#fff', padding: '10px 16px', borderRadius: '14px 14px 4px 14px', maxWidth: '70%', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' },
  bubbleIA: { background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '14px 14px 14px 4px', width: '100%', fontSize: '0.85rem' },
  bubbleError: { background: 'var(--red-light)', border: '1px solid var(--red)', color: 'var(--red-text)', padding: '10px 14px', borderRadius: '14px 14px 14px 4px', maxWidth: '70%', fontSize: '0.82rem' },
  iaTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  iaHeader: { fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' },

  clasesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 },
  claseCard: { background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', transition: 'border-color 0.15s' },
  claseTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  claseMateria: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' },
  claseBody: { display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 },
  claseReqs: { display: 'flex', gap: 4, flexWrap: 'wrap' },

  editGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  editInput: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: '0.78rem', fontFamily: 'inherit', color: 'var(--text-primary)', outline: 'none', width: '100%' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' },

  typing: { display: 'flex', gap: 4, padding: '4px 0' },

  inputArea: { borderTop: '1px solid var(--border)', padding: '0.75rem 0', flexShrink: 0 },
  inputContainer: { display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '8px 12px', boxShadow: 'var(--shadow-sm)' },
  clipBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 },
  textarea: { flex: 1, border: 'none', background: 'transparent', resize: 'none', outline: 'none', fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--text-primary)', lineHeight: 1.5, maxHeight: 140, padding: '4px 0' },
  sendBtn: { width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 },
}
