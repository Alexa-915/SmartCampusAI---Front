import { motion } from 'framer-motion'

/** Card base reutilizable */
export default function Card({ children, style, hover = false, padding = '1.5rem' }) {
  const base = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding,
    boxShadow: 'var(--shadow-sm)',
    transition: 'box-shadow var(--transition), transform var(--transition)',
    ...style,
  }

  if (hover) {
    return (
      <motion.div
        style={base}
        whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {children}
      </motion.div>
    )
  }

  return <div style={base}>{children}</div>
}
