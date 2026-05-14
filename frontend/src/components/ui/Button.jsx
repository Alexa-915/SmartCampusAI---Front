import { motion } from 'framer-motion'

/**
 * Botón reutilizable con variantes y estados de carga
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger'
 */
export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style: extraStyle,
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all var(--transition)',
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    ...sizes[size],
    ...variants[variant],
    ...extraStyle,
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={base}
      whileHover={!disabled && !loading ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </motion.button>
  )
}

function Spinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'btn-spin 0.65s linear infinite',
      opacity: 0.7,
    }} />
  )
}

const sizes = {
  sm: { fontSize: '0.8rem',  padding: '6px 12px',  height: 32 },
  md: { fontSize: '0.875rem', padding: '9px 18px', height: 40 },
  lg: { fontSize: '0.95rem', padding: '12px 24px', height: 48 },
}

const variants = {
  primary: {
    background: 'var(--gradient-accent)',
    color: '#fff',
    boxShadow: '0 2px 12px var(--accent-glow)',
  },
  secondary: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    background: 'var(--red-light)',
    color: 'var(--red-text)',
    border: '1px solid var(--red)',
  },
  yellow: {
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: '#1C1917',
    boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
  },
}

// Inyectar keyframe una sola vez
if (typeof document !== 'undefined' && !document.getElementById('btn-spin-kf')) {
  const s = document.createElement('style')
  s.id = 'btn-spin-kf'
  s.textContent = `@keyframes btn-spin { to { transform: rotate(360deg); } }`
  document.head.appendChild(s)
}
