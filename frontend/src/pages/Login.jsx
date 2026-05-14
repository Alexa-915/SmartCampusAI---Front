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
        {/* Partículas decorativas animadas */}
        <motion.div style={s.particle1} animate={{ y: [-20, 20, -20], x: [-10, 10, -10] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={s.particle2} animate={{ y: [15, -15, 15], x: [10, -10, 10] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={s.particle3} animate={{ y: [-10, 10, -10], scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div style={s.particle4} animate={{ y: [10, -20, 10], opacity: [0.3, 0.7, 0.3] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />

        {/* Grid decorativo de fondo */}
        <div style={s.gridBg} />

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
    background: 'linear-gradient(145deg, #0F0A2E 0%, #1A1145 30%, #0D1B3C 70%, #0A1628 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    maxWidth: 480,
    position: 'relative',
    zIndex: 2,
  },
  gridBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(rgba(99,102,241,0.08) 1px, transparent 1px)',
    backgroundSize: '30px 30px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  particle1: {
    position: 'absolute', width: 120, height: 120, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
    top: '15%', right: '20%', pointerEvents: 'none', zIndex: 1,
    filter: 'blur(1px)',
  },
  particle2: {
    position: 'absolute', width: 80, height: 80, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 70%)',
    bottom: '20%', left: '15%', pointerEvents: 'none', zIndex: 1,
  },
  particle3: {
    position: 'absolute', width: 60, height: 60, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
    top: '60%', right: '10%', pointerEvents: 'none', zIndex: 1,
  },
  particle4: {
    position: 'absolute', width: 200, height: 200, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
    top: '5%', left: '5%', pointerEvents: 'none', zIndex: 1,
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 12,
    marginBottom: '2.5rem',
  },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #F59E0B)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 900, color: '#fff', fontSize: 20, flexShrink: 0,
    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
  },
  logoText: {
    fontWeight: 900, fontSize: '1.3rem', color: '#fff',
    letterSpacing: '-0.02em',
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
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '14px 18px',
    backdropFilter: 'blur(12px)',
    transition: 'all 0.2s ease',
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.2))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#A5B4FC', flexShrink: 0,
    boxShadow: '0 2px 8px rgba(99,102,241,0.2)',
  },
  featureTitle: { color: '#E0E7FF', fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 },
  featureDesc:  { color: '#7C83DB', fontSize: '0.78rem', lineHeight: 1.4 },
  glow1: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 60%)',
    top: '-15%', right: '-15%', pointerEvents: 'none', zIndex: 1,
    filter: 'blur(40px)',
  },
  glow2: {
    position: 'absolute', width: 400, height: 400, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 60%)',
    bottom: '-10%', left: '-5%', pointerEvents: 'none', zIndex: 1,
    filter: 'blur(30px)',
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
