import { motion } from 'framer-motion'

/** Loader de pantalla completa o inline */
export default function Loader({ fullScreen = false, text = 'Cargando...' }) {
  const dots = [0, 1, 2]

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
    }}>
      {/* Logo animado */}
      <motion.div
        style={{
          width: 48, height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, var(--accent), var(--yellow))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800, color: '#fff',
        }}
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        S
      </motion.div>

      {/* Puntos de carga */}
      <div style={{ display: 'flex', gap: 6 }}>
        {dots.map(i => (
          <motion.span
            key={i}
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: 'var(--accent)',
              display: 'block',
            }}
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{text}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}>
        {content}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4rem 0',
    }}>
      {content}
    </div>
  )
}
