import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Zap, BarChart3, Shield } from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import ThemeToggle from '../components/layout/ThemeToggle'

const FEATURES = [
  { icon: Zap,       title: 'CSP Solver',         desc: 'Algoritmo de satisfacción de restricciones' },
  { icon: BarChart3, title: 'Analíticas en vivo',  desc: 'Métricas y distribución en tiempo real' },
  { icon: Shield,    title: 'Control de acceso',   desc: 'Roles diferenciados por usuario' },
]

export default function Login() {
  const [form, setForm]       = useState({ email: '', contraseña: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate              = useNavigate()
  const location              = useLocation()
  const { saveSession }       = useAuth()

  // Si venía de una ruta protegida, volver ahí; si no, ir al dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await login(form)
      // Guardar sesión en el contexto (también persiste en localStorage)
      saveSession(res.data.access_token, res.data.usuario)
      // replace: true para que el login no quede en el historial
      navigate(from, { replace: true })
    } catch {
      setError('Email o contraseña incorrectos. Verifica tus datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Panel izquierdo — branding */}
      <div style={s.left}>
        <div style={s.leftContent}>
          {/* Logo */}
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
            Asignación inteligente de espacios académicos
          </motion.h1>

          <motion.p
            style={s.tagline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Optimiza el uso de salones universitarios con IA y algoritmos avanzados de restricciones.
          </motion.p>

          {/* Feature cards */}
          <div style={s.features}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                style={s.featureCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <div style={s.featureIcon}><Icon size={16} /></div>
                <div>
                  <div style={s.featureTitle}>{title}</div>
                  <div style={s.featureDesc}>{desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decoración de fondo */}
        <div style={s.glow1} />
        <div style={s.glow2} />
      </div>

      {/* Panel derecho — formulario */}
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
            <h2 style={s.formTitle}>Bienvenido de nuevo</h2>
            <p style={s.formSub}>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
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
              placeholder="Tu contraseña"
              value={form.contraseña}
              onChange={v => setForm({ ...form, contraseña: v })}
              icon={Lock}
              required
            />

            <Alert type="error" message={error} onClose={() => setError('')} />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <p style={s.footerText}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" style={s.link}>Regístrate aquí</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

const s = {
  page: {
    display: 'flex',
    minHeight: '100vh',
  },
  left: {
    flex: 1,
    background: 'linear-gradient(145deg, #1E1B4B 0%, #312E81 40%, #1E3A5F 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    maxWidth: 460,
    position: 'relative',
    zIndex: 1,
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    marginBottom: '2rem',
  },
  logoIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: 'linear-gradient(135deg, #6366F1, #F59E0B)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, color: '#fff', fontSize: 18, flexShrink: 0,
  },
  logoText: {
    fontWeight: 800, fontSize: '1.2rem', color: '#fff',
  },
  headline: {
    fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
    fontWeight: 800,
    color: '#fff',
    lineHeight: 1.25,
    marginBottom: '1rem',
  },
  tagline: {
    color: '#A5B4FC',
    fontSize: '0.95rem',
    lineHeight: 1.7,
    marginBottom: '2.5rem',
  },
  features: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  featureCard: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 16px',
    backdropFilter: 'blur(8px)',
  },
  featureIcon: {
    width: 32, height: 32, borderRadius: 8,
    background: 'rgba(99,102,241,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#A5B4FC', flexShrink: 0,
  },
  featureTitle: { color: '#E0E7FF', fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 },
  featureDesc:  { color: '#818CF8', fontSize: '0.78rem' },
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
    width: '100%',
    maxWidth: 480,
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid var(--border)',
    position: 'relative',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '1.25rem 1.5rem',
  },
  formWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '1rem 2.5rem 3rem',
    maxWidth: 400,
    width: '100%',
    margin: '0 auto',
  },
  formHeader: { marginBottom: '2rem' },
  formTitle: {
    fontSize: '1.5rem', fontWeight: 800,
    color: 'var(--text-primary)', marginBottom: 6,
  },
  formSub: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.5rem' },
  footerText: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    marginTop: '1rem',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
