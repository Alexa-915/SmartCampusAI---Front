import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Eye, Shield } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/api'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import ThemeToggle from '../components/layout/ThemeToggle'

export default function Register() {
  const [form, setForm]       = useState({ nombre: '', email: '', contraseña: '', rol: 'viewer' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la cuenta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Izquierda */}
      <div style={s.left}>
        <div style={s.leftContent}>
          <motion.div
            style={s.logoWrap}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div style={s.logoIcon}>S</div>
            <span style={s.logoText}>
              Smart<span style={{ color: '#A5B4FC' }}>Campus</span>
              <span style={{ color: '#FCD34D' }}>AI</span>
            </span>
          </motion.div>

          <motion.h1
            style={s.headline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Únete al sistema de gestión académica
          </motion.h1>

          <motion.p
            style={s.tagline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Crea tu cuenta y accede a las herramientas de asignación inteligente de espacios universitarios.
          </motion.p>

          {/* Pasos */}
          <div style={s.steps}>
            {[
              'Crea tu cuenta con tu correo institucional',
              'Elige tu rol según tus permisos de acceso',
              'Accede al panel de control y analíticas',
            ].map((text, i) => (
              <motion.div
                key={i}
                style={s.step}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <div style={s.stepNum}>{i + 1}</div>
                <p style={s.stepText}>{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={s.glow1} />
        <div style={s.glow2} />
      </div>

      {/* Derecha */}
      <div style={s.right}>
        <div style={s.topBar}>
          <ThemeToggle />
        </div>

        <motion.div
          style={s.formWrap}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <div style={s.formHeader}>
            <h2 style={s.formTitle}>Crear cuenta</h2>
            <p style={s.formSub}>Completa los datos para registrarte</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <Input
              label="Nombre completo"
              type="text"
              placeholder="Tu nombre"
              value={form.nombre}
              onChange={v => setForm({ ...form, nombre: v })}
              icon={User}
              required
            />
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={v => setForm({ ...form, email: v })}
              icon={Mail}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.contraseña}
              onChange={v => setForm({ ...form, contraseña: v })}
              icon={Lock}
              required
            />

            {/* Selector de rol */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={s.roleLabel}>Rol de acceso</label>
              <div style={s.roleGrid}>
                <RoleCard
                  icon={Eye}
                  title="Viewer"
                  desc="Solo visualización de resultados"
                  selected={form.rol === 'viewer'}
                  onClick={() => setForm({ ...form, rol: 'viewer' })}
                />
                <RoleCard
                  icon={Shield}
                  title="Admin"
                  desc="Acceso completo al sistema"
                  selected={form.rol === 'admin'}
                  onClick={() => setForm({ ...form, rol: 'admin' })}
                />
              </div>
            </div>

            <Alert type="error" message={error} onClose={() => setError('')} />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Crear cuenta
            </Button>
          </form>

          <p style={s.footerText}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={s.link}>Inicia sesión</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function RoleCard({ icon: Icon, title, desc, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      style={{
        flex: 1,
        padding: '12px',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-light)' : 'var(--bg)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all var(--transition)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: selected ? 'var(--accent)' : 'var(--bg-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: selected ? '#fff' : 'var(--text-muted)',
        marginBottom: 8, transition: 'all var(--transition)',
      }}>
        <Icon size={14} />
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: selected ? 'var(--accent-text)' : 'var(--text-primary)', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{desc}</div>
    </motion.button>
  )
}

const s = {
  page: { display: 'flex', minHeight: '100vh' },
  left: {
    flex: 1,
    background: 'linear-gradient(145deg, #1E1B4B 0%, #312E81 40%, #1E3A5F 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3rem', position: 'relative', overflow: 'hidden',
  },
  leftContent: { maxWidth: 460, position: 'relative', zIndex: 1 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' },
  logoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366F1, #F59E0B)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, color: '#fff', fontSize: 18, flexShrink: 0,
  },
  logoText: { fontWeight: 800, fontSize: '1.2rem', color: '#fff' },
  headline: {
    fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800,
    color: '#fff', lineHeight: 1.25, marginBottom: '1rem',
  },
  tagline: { color: '#A5B4FC', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2.5rem' },
  steps: { display: 'flex', flexDirection: 'column', gap: 14 },
  step: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'rgba(99,102,241,0.35)',
    border: '1px solid rgba(165,180,252,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 700, color: '#A5B4FC', flexShrink: 0,
  },
  stepText: { color: '#C7D2FE', fontSize: '0.875rem', lineHeight: 1.5, paddingTop: 3 },
  glow1: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
    top: '-10%', right: '-10%', pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute', width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)',
    bottom: '5%', left: '5%', pointerEvents: 'none',
  },
  right: {
    width: '100%', maxWidth: 480,
    background: 'var(--bg)',
    display: 'flex', flexDirection: 'column',
    borderLeft: '1px solid var(--border)',
  },
  topBar: { display: 'flex', justifyContent: 'flex-end', padding: '1.25rem 1.5rem' },
  formWrap: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
    padding: '0.5rem 2.5rem 3rem',
    maxWidth: 400, width: '100%', margin: '0 auto',
  },
  formHeader: { marginBottom: '1.75rem' },
  formTitle: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 },
  formSub: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' },
  roleLabel: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' },
  roleGrid: { display: 'flex', gap: 10 },
  footerText: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' },
  link: { color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 },
}
