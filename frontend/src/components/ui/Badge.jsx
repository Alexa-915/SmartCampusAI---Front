/** Badge de estado con variantes de color */
export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const colors = {
    default: { bg: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: 'var(--border)' },
    accent:  { bg: 'var(--accent-light)', color: 'var(--accent-text)', border: 'transparent' },
    green:   { bg: 'var(--green-light)', color: 'var(--green-text)', border: 'transparent' },
    yellow:  { bg: 'var(--yellow-light)', color: 'var(--yellow-text)', border: 'transparent' },
    red:     { bg: 'var(--red-light)', color: 'var(--red-text)', border: 'transparent' },
    blue:    { bg: 'var(--blue-light)', color: 'var(--blue-text)', border: 'transparent' },
  }

  const c = colors[variant] || colors.default

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      borderRadius: 99,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      fontSize: size === 'sm' ? '0.72rem' : '0.8rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
