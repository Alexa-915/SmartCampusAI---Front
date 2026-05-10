import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import TimePicker from '../ui/TimePicker'
import Button from '../ui/Button'
import Alert from '../ui/Alert'

const GRUPOS = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5']
const TIPOS  = ['Planta', 'Catedrático']

const EMPTY = {
  materia: '', grupo: '', profesor: '', tipo: '',
  horario: '', estudiantes: '', programa: '', duracion: '',
  requiere_videobeam: false, requiere_computadores: false, requiere_laboratorio: false,
}

/**
 * Formulario para crear o editar una clase.
 * clasesExistentes: array de clases del dataset actual (para detectar duplicados en tiempo real)
 * inicial: datos de la clase a editar (null si es nueva)
 */
export default function ClaseForm({ inicial, onSubmit, onCancel, clasesExistentes = [], errorInicial = '' }) {
  const [form, setForm]       = useState(inicial ?? EMPTY)
  const [error, setError]     = useState(errorInicial)
  const [loading, setLoading] = useState(false)

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  // Helper de validación — definido antes del useMemo que lo usa
  const horarioValido = (h) => {
    if (!h) return false
    const parts = h.split('–')
    return parts.length === 2 && parts[0].trim() && parts[1].trim()
  }

  // ── Validaciones en tiempo real ─────────────────────────────────────────
  const conflictos = useMemo(() => {
    const lista = []

    // 1. Duplicado materia + grupo
    if (form.materia.trim() && form.grupo) {
      const duplicado = clasesExistentes.find(c =>
        c.materia?.toLowerCase() === form.materia.trim().toLowerCase() &&
        c.grupo === form.grupo &&
        c.id !== inicial?.id  // excluir la clase que estamos editando
      )
      if (duplicado) {
        lista.push({
          campo: 'materia',
          mensaje: `Ya existe "${form.materia}" con ${form.grupo} en este dataset.`,
        })
      }
    }

    // 2. Horario incompleto
    if (form.horario && !horarioValido(form.horario)) {
      lista.push({
        campo: 'horario',
        mensaje: 'Selecciona hora de inicio y fin.',
      })
    }

    // 3. Estudiantes inválido
    if (form.estudiantes && parseInt(form.estudiantes) <= 0) {
      lista.push({
        campo: 'estudiantes',
        mensaje: 'El número de estudiantes debe ser mayor a 0.',
      })
    }

    // 4. Campos obligatorios vacíos (solo mostrar si el usuario ya interactuó)
    if (form.materia && !form.materia.trim()) {
      lista.push({ campo: 'materia', mensaje: 'La materia no puede estar vacía.' })
    }

    return lista
  }, [form, clasesExistentes, inicial])

  // Hay errores críticos que impiden guardar
  const tieneErroresCriticos = conflictos.some(c => c.campo === 'materia' && c.mensaje.includes('Ya existe'))

  // Obtener error de un campo específico
  const errorDe = (campo) => conflictos.find(c => c.campo === campo)?.mensaje || ''

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validaciones finales antes de enviar
    if (!form.materia.trim() || !form.grupo || !form.profesor.trim() || !form.tipo) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    if (!horarioValido(form.horario)) {
      setError('Debes seleccionar hora de inicio y fin.')
      return
    }
    if (!form.estudiantes || parseInt(form.estudiantes) <= 0) {
      setError('El número de estudiantes debe ser mayor a 0.')
      return
    }
    if (tieneErroresCriticos) {
      setError('Corrige los conflictos antes de guardar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        estudiantes: parseInt(form.estudiantes) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar la clase')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Panel de conflictos — solo si hay errores */}
      <AnimatePresence>
        {conflictos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={s.conflictPanel}
          >
            <div style={s.conflictHeader}>
              <AlertTriangle size={14} style={{ color: 'var(--yellow)' }} />
              <span>Se encontró {conflictos.length} conflicto{conflictos.length > 1 ? 's' : ''}</span>
            </div>
            {conflictos.map((c, i) => (
              <p key={i} style={s.conflictItem}>• {c.mensaje}</p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fila 1 — Materia + Grupo */}
      <div style={row}>
        <Input
          label="Materia"
          placeholder="Ej: Cálculo I"
          value={form.materia}
          onChange={v => set('materia', v)}
          error={errorDe('materia')}
          required
        />
        <Select
          label="Grupo"
          value={form.grupo}
          onChange={v => set('grupo', v)}
          options={GRUPOS}
          placeholder="Selecciona grupo..."
          error={errorDe('grupo')}
          required
        />
      </div>

      {/* Fila 2 — Profesor + Tipo */}
      <div style={row}>
        <Input
          label="Profesor"
          placeholder="Nombre completo"
          value={form.profesor}
          onChange={v => set('profesor', v)}
          required
        />
        <Select
          label="Tipo de profesor"
          value={form.tipo}
          onChange={v => {
            set('tipo', v)
            set('horario', '')
          }}
          options={TIPOS}
          placeholder="Selecciona tipo..."
          required
        />
      </div>

      {/* Fila 3 — Horario + Estudiantes */}
      <div style={row}>
        <TimePicker
          value={form.horario}
          onChange={v => set('horario', v)}
          tipo={form.tipo}
          error={errorDe('horario')}
        />
        <Input
          label="Estudiantes"
          type="number"
          placeholder="30"
          value={form.estudiantes}
          onChange={v => set('estudiantes', v)}
          error={errorDe('estudiantes')}
          required
        />
      </div>

      {/* Fila 4 — Opcionales */}
      <div style={row}>
        <Input
          label="Programa (opcional)"
          placeholder="Ej: Ingeniería de Sistemas"
          value={form.programa ?? ''}
          onChange={v => set('programa', v)}
        />
        <Input
          label="Duración (opcional)"
          placeholder="Ej: 2h"
          value={form.duracion ?? ''}
          onChange={v => set('duracion', v)}
        />
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Requisitos especiales</label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <CheckField label="Videobeam" checked={form.requiere_videobeam} onChange={v => set('requiere_videobeam', v)} />
          <CheckField label="Computadores" checked={form.requiere_computadores} onChange={v => set('requiere_computadores', v)} />
          <CheckField label="Laboratorio" checked={form.requiere_laboratorio} onChange={v => set('requiere_laboratorio', v)} />
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" loading={loading} disabled={tieneErroresCriticos}>
          {inicial ? 'Guardar cambios' : 'Crear clase'}
        </Button>
      </div>
    </form>
  )
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
      {label}
    </label>
  )
}

const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }
const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }

const s = {
  conflictPanel: {
    background: 'var(--yellow-light)',
    border: '1px solid var(--yellow)',
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
  },
  conflictHeader: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--yellow-text)', marginBottom: 6,
  },
  conflictItem: {
    fontSize: '0.78rem', color: 'var(--yellow-text)',
    margin: '2px 0', paddingLeft: 4,
  },
}
