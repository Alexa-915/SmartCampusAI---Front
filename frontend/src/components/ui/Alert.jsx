import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const config = {
  success: { icon: CheckCircle, bg: 'var(--green-light)',  color: 'var(--green-text)',  border: 'var(--green)' },
  error:   { icon: XCircle,     bg: 'var(--red-light)',    color: 'var(--red-text)',    border: 'var(--red)' },
  warning: { icon: AlertTriangle,bg: 'var(--yellow-light)',color: 'var(--yellow-text)', border: 'var(--yellow)' },
  info:    { icon: Info,         bg: 'var(--blue-light)',   color: 'var(--blue-text)',   border: 'var(--blue)' },
}

export default function Alert({ type = 'info', message, onClose }) {
  const { icon: Icon, bg, color, border } = config[type] || config.info

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: bg,
            color,
            border: `1px solid ${border}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
