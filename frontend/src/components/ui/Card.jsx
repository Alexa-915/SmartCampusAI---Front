import { motion } from 'framer-motion'

/** Card base reutilizable con diseño premium */
export default function Card({ children, style, hover = false, padding = '1.5rem' }) {
  const base = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding,
    boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow var(--transition), transform var(--transition), border-color var(--transition)',
    ...style,
  }

  if (hover) {
    return (
      <motion.div
        style={base}
        whileHover={{ y: -3, boxShadow: 'var(--shadow-lg)' }}
        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      >
        {children}
      </motion.div>
    )
  }

  return <div style={base}>{children}</div>
}
