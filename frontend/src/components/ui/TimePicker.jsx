import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronDown } from 'lucide-react'

// Genera slots cada 30 min de 6:00 a 21:00
const SLOTS = (() => {
  const list = []
  for (let h = 6; h <= 21; h++) {
    list.push(`${h}:00`)
    if (h < 21) list.push(`${h}:30`)
  }
  return list
})()

// Convierte "7:30" → minutos desde medianoche (450)
const toMin = (t) => {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

/**
 * Selector de hora con dropdown estilizado.
 * value: string "H:MM"
 * onChange: (value: string) => void
 * label, placeholder, error, disabled
 */
function TimeDropdown({ label, value, onChange, placeholder = 'Hora', error, disabled, disabledBefore, disabledAfter }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef()

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll automático al item seleccionado cuando se abre
  const listRef = useRef()
  useEffect(() => {
    if (open && value && listRef.current) {
      const idx   = SLOTS.indexOf(value)
      const item  = listRef.current.children[idx]
      if (item) item.scrollIntoView({ block: 'center' })
    }
  }, [open, value])

  const isDisabled = (slot) => {
    const m = toMin(slot)
    if (disabledBefore !== undefined && m < toMin(disabledBefore)) return true
    if (disabledAfter  !== undefined && m > toMin(disabledAfter))  return true
    return false
  }

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, position: 'relative' }}>
      {label && (
        <label style={s.label}>{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        style={{
          ...s.trigger,
          borderColor: error ? 'var(--red)' : open ? 'var(--border-focus)' : 'var(--border)',
          boxShadow:   error ? '0 0 0 3px rgba(239,68,68,0.15)'
                     : open  ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
          opacity: disabled ? 0.5 : 1,
          cursor:  disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <Clock size={14} style={{ color: open ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '0.9rem', flex: 1, textAlign: 'left' }}>
          {value || placeholder}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </motion.div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0,  scaleY: 1    }}
            exit={{    opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ ...s.dropdown, transformOrigin: 'top' }}
          >
            <div ref={listRef} style={s.list}>
              {SLOTS.map(slot => {
                const dis      = isDisabled(slot)
                const selected = slot === value
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={dis}
                    onClick={() => { onChange(slot); setOpen(false) }}
                    style={{
                      ...s.option,
                      background:  selected ? 'var(--accent-light)' : 'transparent',
                      color:       dis      ? 'var(--text-muted)'
                                 : selected ? 'var(--accent-text)' : 'var(--text-primary)',
                      fontWeight:  selected ? 600 : 400,
                      cursor:      dis ? 'not-allowed' : 'pointer',
                      opacity:     dis ? 0.4 : 1,
                    }}
                  >
                    {slot}
                    {selected && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 10 }}>✓</span>}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p style={s.errorText}>{error}</p>}
    </div>
  )
}

/**
 * TimePicker completo: inicio + fin con validación de rango y reglas de negocio.
 *
 * value:    string "H:MM–H:MM"  (formato del Excel)
 * onChange: (value: string) => void
 * tipo:     'Planta' | 'Catedrático' — para validar reglas
 */
export default function TimePicker({ value, onChange, tipo, error: externalError }) {
  // Parsear el valor actual "7:00–9:00" → { inicio, fin }
  const parse = (v) => {
    if (!v) return { inicio: '', fin: '' }
    const parts = v.split('–')
    return { inicio: parts[0]?.trim() || '', fin: parts[1]?.trim() || '' }
  }

  const { inicio, fin } = parse(value)

  const setInicio = (v) => {
    onChange(v && fin ? `${v}–${fin}` : '')
  }
  const setFin = (v) => {
    onChange(inicio && v ? `${inicio}–${v}` : '')
  }

  // ── Validaciones ──────────────────────────────────────────────────────────

  // 1. Fin debe ser mayor que inicio
  const rangoInvalido = inicio && fin && toMin(fin) <= toMin(inicio)

  // 2. Reglas de negocio según tipo de profesor
  const advertenciaPlanta = (() => {
    if (tipo !== 'Planta' || !inicio || !fin) return ''
    const ini = toMin(inicio)
    const end = toMin(fin)
    // Planta: 7:00–12:00 o 14:00–18:30
    const bloqueM = ini >= toMin('7:00')  && end <= toMin('12:00')
    const bloqueT = ini >= toMin('14:00') && end <= toMin('18:30')
    if (!bloqueM && !bloqueT) {
      return 'Profesores de planta solo pueden tener clases de 7:00–12:00 o 14:00–18:30'
    }
    return ''
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={s.label}>Horario</label>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <TimeDropdown
          label="Inicio"
          value={inicio}
          onChange={setInicio}
          placeholder="6:00"
        />

        {/* Separador visual */}
        <div style={{ paddingTop: 30, color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>–</div>

        <TimeDropdown
          label="Fin"
          value={fin}
          onChange={setFin}
          placeholder="8:00"
          disabledBefore={inicio || undefined}   // fin no puede ser antes que inicio
          error={rangoInvalido ? 'Debe ser mayor que la hora de inicio' : ''}
        />
      </div>

      {/* Advertencia de regla de negocio — en tiempo real */}
      <AnimatePresence>
        {advertenciaPlanta && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{    opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={s.warning}
          >
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span>{advertenciaPlanta}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {externalError && <p style={s.errorText}>{externalError}</p>}
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  label: {
    fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-secondary)', letterSpacing: '0.04em',
  },
  trigger: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%',
    background: 'var(--bg)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '9px 12px',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  dropdown: {
    position: 'absolute',
    zIndex: 200,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    overflow: 'hidden',
  },
  list: {
    maxHeight: 200,
    overflowY: 'auto',
    padding: '4px 0',
  },
  option: {
    display: 'flex', alignItems: 'center',
    width: '100%', padding: '7px 14px',
    border: 'none', fontFamily: 'inherit',
    fontSize: '0.875rem',
    transition: 'background var(--transition)',
    textAlign: 'left',
  },
  warning: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    background: 'var(--yellow-light)',
    border: '1px solid var(--yellow)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    fontSize: '0.8rem',
    color: 'var(--yellow-text)',
    lineHeight: 1.4,
  },
  errorText: {
    fontSize: '0.78rem', color: 'var(--red)', marginTop: 2,
  },
}
