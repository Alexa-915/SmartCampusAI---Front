import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'

/**
 * Diálogo de confirmación estilizado que reemplaza el confirm() nativo.
 * open: boolean
 * title: texto del encabezado
 * message: descripción de lo que se va a hacer
 * confirmText: texto del botón de confirmar (ej: "Eliminar")
 * onConfirm: callback al confirmar
 * onCancel: callback al cancelar
 */
export default function ConfirmDialog({ open, title, message, confirmText = 'Eliminar', onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
          style={s.overlay}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            style={s.dialog}
          >
            {/* Icono de advertencia */}
            <div style={s.iconWrap}>
              <AlertTriangle size={22} style={{ color: 'var(--yellow)' }} />
            </div>

            {/* Texto */}
            <h3 style={s.title}>{title}</h3>
            <p style={s.message}>{message}</p>

            {/* Botones */}
            <div style={s.actions}>
              <Button variant="secondary" onClick={onCancel} size="sm">
                Cancelar
              </Button>
              <Button variant="danger" onClick={onConfirm} size="sm">
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-xl)',
    padding: '2rem',
    textAlign: 'center',
  },
  iconWrap: {
    width: 48, height: 48,
    borderRadius: 12,
    background: 'var(--yellow-light)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1rem',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 8,
  },
  message: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '1.5rem',
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
  },
}
