import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Input reutilizable con soporte para password toggle y estados de error
 */
export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required,
  icon: Icon,
}) {
  const [focused, setFocused] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPass ? 'text' : 'password') : type

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}>
          {label}
        </label>
      )}

      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        {Icon && (
          <span style={{
            position: 'absolute', left: 12,
            color: focused ? 'var(--accent)' : 'var(--text-muted)',
            display: 'flex', transition: 'color var(--transition)',
          }}>
            <Icon size={16} />
          </span>
        )}

        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          aria-label={label || placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: `1.5px solid ${error ? 'var(--red)' : focused ? 'var(--border-focus)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
            padding: `10px ${isPassword ? '40px' : '14px'} 10px ${Icon ? '38px' : '14px'}`,
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color var(--transition), box-shadow var(--transition)',
            boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}` : 'none',
            fontFamily: 'inherit',
          }}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            style={{
              position: 'absolute', right: 12,
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', padding: 0,
              transition: 'color var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: 2 }}>{error}</p>
      )}
    </div>
  )
}
