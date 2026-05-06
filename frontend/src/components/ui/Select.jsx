import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Select estilizado que sigue el mismo diseño que Input.jsx
 * options: [{ value, label }] o ['string', ...]
 * placeholder: texto cuando no hay valor seleccionado
 */
export default function Select({ label, value, onChange, options = [], placeholder = 'Selecciona...', required, error }) {
  const [focused, setFocused] = useState(false)

  // Acepta tanto strings como { value, label }
  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: '0.8rem', fontWeight: 600,
          color: 'var(--text-secondary)', letterSpacing: '0.04em',
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            appearance: 'none',           // quita la flecha nativa del SO
            background: 'var(--bg)',
            border: `1.5px solid ${error ? 'var(--red)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 36px 10px 14px',
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: '0.9rem',
            outline: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color var(--transition), box-shadow var(--transition)',
            boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}` : 'none',
          }}
        >
          <option value="" disabled>{placeholder}</option>
          {normalized.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Flecha personalizada */}
        <ChevronDown
          size={15}
          style={{
            position: 'absolute', right: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: 2 }}>{error}</p>
      )}
    </div>
  )
}
