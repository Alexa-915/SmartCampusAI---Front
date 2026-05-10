import { useState } from 'react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import Alert from '../ui/Alert'

const EMPTY = {
  codigo: '', bloque: '', capacidad: '', tipologia: '',
  tiene_videobeam: false, tiene_computadores: false, es_laboratorio: false,
}

/**
 * Formulario para crear o editar un salón.
 * bloquesExistentes / tipologiasExistentes: opciones dinámicas del dataset.
 * Si el usuario necesita un valor nuevo, puede cambiar a modo "escribir".
 */
export default function SalonForm({ inicial, onSubmit, onCancel, bloquesExistentes = [], tipologiasExistentes = [] }) {
  const [form, setForm]       = useState(inicial ?? EMPTY)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Modo de entrada para bloque y tipología: 'select' o 'input'
  const [bloqueMode, setBloqueMode] = useState(() => {
    // Si el valor inicial no está en las opciones existentes, empezar en modo input
    if (inicial?.bloque && !bloquesExistentes.includes(inicial.bloque)) return 'input'
    return bloquesExistentes.length > 0 ? 'select' : 'input'
  })
  const [tipoMode, setTipoMode] = useState(() => {
    if (inicial?.tipologia && !tipologiasExistentes.includes(inicial.tipologia)) return 'input'
    return tipologiasExistentes.length > 0 ? 'select' : 'input'
  })

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.codigo.trim()) {
      setError('El código del salón es obligatorio.')
      return
    }
    if (!form.capacidad || parseInt(form.capacidad) <= 0) {
      setError('La capacidad debe ser mayor a 0.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        capacidad: parseInt(form.capacidad) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el salón')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={row}>
        <Input
          label="Código"
          placeholder="A-101"
          value={form.codigo}
          onChange={v => set('codigo', v)}
          required
        />

        {/* Bloque — toggle entre select y input libre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={labelStyle}>Bloque</label>
            {bloquesExistentes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBloqueMode(m => m === 'select' ? 'input' : 'select')
                  set('bloque', '')
                }}
                style={toggleBtn}
              >
                {bloqueMode === 'select' ? '+ Nuevo' : '← Existente'}
              </button>
            )}
          </div>
          {bloqueMode === 'select' ? (
            <Select
              value={form.bloque}
              onChange={v => set('bloque', v)}
              options={bloquesExistentes}
              placeholder="Selecciona bloque..."
            />
          ) : (
            <Input
              placeholder="Escribe el nombre del bloque"
              value={form.bloque ?? ''}
              onChange={v => set('bloque', v)}
            />
          )}
        </div>
      </div>

      <div style={row}>
        <Input
          label="Capacidad"
          type="number"
          placeholder="40"
          value={form.capacidad}
          onChange={v => set('capacidad', v)}
          required
        />

        {/* Tipología — mismo patrón que bloque */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={labelStyle}>Tipología</label>
            {tipologiasExistentes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTipoMode(m => m === 'select' ? 'input' : 'select')
                  set('tipologia', '')
                }}
                style={toggleBtn}
              >
                {tipoMode === 'select' ? '+ Nueva' : '← Existente'}
              </button>
            )}
          </div>
          {tipoMode === 'select' ? (
            <Select
              value={form.tipologia ?? ''}
              onChange={v => set('tipologia', v)}
              options={tipologiasExistentes}
              placeholder="Selecciona tipología..."
            />
          ) : (
            <Input
              placeholder="Escribe la tipología"
              value={form.tipologia ?? ''}
              onChange={v => set('tipologia', v)}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={labelStyle}>Equipamiento disponible</label>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <CheckField label="Videobeam"      checked={form.tiene_videobeam}    onChange={v => set('tiene_videobeam', v)} />
          <CheckField label="Computadores"   checked={form.tiene_computadores} onChange={v => set('tiene_computadores', v)} />
          <CheckField label="Es laboratorio" checked={form.es_laboratorio}     onChange={v => set('es_laboratorio', v)} />
        </div>
      </div>

      <Alert type="error" message={error} onClose={() => setError('')} />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel} type="button">Cancelar</Button>
        <Button type="submit" loading={loading}>
          {inicial ? 'Guardar cambios' : 'Crear salón'}
        </Button>
      </div>
    </form>
  )
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }
const toggleBtn = {
  background: 'none', border: 'none',
  color: 'var(--accent)', fontSize: '0.72rem',
  fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', padding: 0,
  transition: 'opacity var(--transition)',
}
