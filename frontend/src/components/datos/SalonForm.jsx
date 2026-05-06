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
 * bloquesExistentes: bloques únicos del dataset actual.
 * tipologiasExistentes: tipologías únicas del dataset actual.
 * Si están vacíos (dataset nuevo), los campos quedan como input libre.
 */
export default function SalonForm({ inicial, onSubmit, onCancel, bloquesExistentes = [], tipologiasExistentes = [] }) {
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
        capacidad: parseInt(form.capacidad) || 0,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el salón')
    } finally {
      setLoading(false)
    }
  }

  // Opciones del select: bloques existentes + opción "Otro" para ingresar uno nuevo
  const opcionesBloques = bloquesExistentes.length > 0
    ? [...bloquesExistentes, '— Otro (escribir) —']
    : []

  // Si eligió "Otro" o no hay opciones, mostrar input libre
  const bloqueEsOtro = form.bloque === '— Otro (escribir) —'
  const mostrarInput = bloquesExistentes.length === 0 || bloqueEsOtro

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

        {/* Bloque: select dinámico si hay datos, input libre si no */}
        {bloquesExistentes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Select
              label="Bloque"
              value={bloqueEsOtro ? '— Otro (escribir) —' : form.bloque}
              onChange={v => set('bloque', v === '— Otro (escribir) —' ? '— Otro (escribir) —' : v)}
              options={opcionesBloques}
              placeholder="Selecciona bloque..."
            />
            {/* Si eligió "Otro", mostrar input debajo */}
            {bloqueEsOtro && (
              <Input
                placeholder="Escribe el nombre del bloque"
                value={form._bloqueCustom ?? ''}
                onChange={v => setForm(f => ({ ...f, bloque: v, _bloqueCustom: v }))}
              />
            )}
          </div>
        ) : (
          <Input
            label="Bloque"
            placeholder="Ej: Bloque A"
            value={form.bloque ?? ''}
            onChange={v => set('bloque', v)}
          />
        )}
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

        {/* Tipología: select dinámico si hay datos, input libre si no */}
        {tipologiasExistentes.length > 0 ? (
          <Select
            label="Tipología"
            value={form.tipologia ?? ''}
            onChange={v => set('tipologia', v)}
            options={tipologiasExistentes}
            placeholder="Selecciona tipología..."
          />
        ) : (
          <Input
            label="Tipología (opcional)"
            placeholder="Ej: Aula, Lab"
            value={form.tipologia ?? ''}
            onChange={v => set('tipologia', v)}
          />
        )}
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
