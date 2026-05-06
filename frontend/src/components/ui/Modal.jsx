import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Modal centrado en pantalla con scroll interno si el contenido es largo.
 * El centrado usa flexbox en el overlay para evitar conflictos con framer-motion.
 */
export default function Modal({ open, onClose, title, children, width = 520 }) {

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        // El overlay es el que centra — usa flex para centrado perfecto
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          style={s.overlay}
        >
          {/* El modal en sí — stopPropagation evita cerrar al hacer clic dentro */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={{ ...s.modal, maxWidth: width }}
          >
            {/* Header */}
            <div style={s.header}>
              <h3 style={s.title}>{title}</h3>
              <button onClick={onClose} style={s.closeBtn} aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            {/* Body con scroll si el contenido es largo */}
            <div style={s.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const s = {
  // El overlay ocupa toda la pantalla y centra con flexbox
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',          // margen en móvil
  },
  modal: {
    width: '100%',            // ocupa hasta maxWidth
    maxHeight: '90vh',        // nunca más alto que la pantalla
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',       // el header queda fijo
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,            // el header nunca se encoge
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    padding: 6,
    borderRadius: 6,
    transition: 'color var(--transition), background var(--transition)',
    flexShrink: 0,
  },
  body: {
    padding: '1.5rem',
    overflowY: 'auto',        // scroll interno si el formulario es largo
    flex: 1,
  },
}
