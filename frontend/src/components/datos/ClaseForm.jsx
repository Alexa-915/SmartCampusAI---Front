import { useState } from 'react'
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
 * Los campos críticos usan Select para evitar errores de escritura.
 */
export default function ClaseForm({ inicial, onSubmit, onCancel }) {
  const [form, setForm]       = useState(inicial ?? EMPTY)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  const handleSubmit = async (e) => {
    e.preventDefault()
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

      {/* Fila 1 — Materia (libre) + Grupo (select) */}
      <div style={row}>
        <Input
          label="Materia"
          placeholder="Ej: Cálculo I"
          value={form.materia}
          onChange={v => set('materia', v)}
          required
        />
        <Select
          label="Grupo"
          value={form.grupo}
          onChange={v => set('grupo', v)}
          options={GRUPOS}
          placeholder="Selecciona grupo..."
          required
        />
      </div>

      {/* Fila 2 — Profesor (libre) + Tipo (select Planta/Catedrático) */}
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
            // Al cambiar el tipo, limpiar el horario para forzar una selección válida
            set('tipo', v)
            set('horario', '')
          }}
          options={TIPOS}
          placeholder="Selecciona tipo..."
          required
        />
      </div>

      {/* Fila 3 — Horario (time picker) + Estudiantes */}
      <div style={row}>
        <TimePicker
          value={form.horario}
          onChange={v => set('horario', v)}
          tipo={form.tipo}
        />
        <Input
          label="Estudiantes"
          type="number"
          placeholder="30"
          value={form.estudiantes}
          onChange={v => set('estudiantes', v)}
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

      {/* Checkboxes de requisitos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Requisitos especiales</label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <CheckField
            label="Videobeam"
            checked={form.requiere_videobeam}
            onChange={v => set('requiere_videobeam', v)}
          />
          <CheckField
            label="Computadores"
            checked={form.requiere_computadores}
            onChange={v => set('requiere_computadores', v)}
          />
          <CheckField
            label="Laboratorio"
            checked={form.requiere_laboratorio}
            onChange={v => set('requiere_laboratorio', v)}
          />
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" loading={loading}>
          {inicial ? 'Guardar cambios' : 'Crear clase'}
        </Button>
      </div>
    </form>
  )
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6,
      cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
      />
      {label}
    </label>
  )
}

const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }
const labelStyle = {
  fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--text-secondary)', letterSpacing: '0.04em',
}
