import { motion } from 'framer-motion'
import { LayoutDashboard, Database, Table2, Settings, LogOut, Sparkles } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAccessibility } from '../../context/AccessibilityContext'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard' },
  { icon: Database,        label: 'Datos',       path: '/datos' },
  { icon: Sparkles,        label: 'Asistente IA', path: '/asistente-ia' },
  { icon: Table2,          label: 'Resultados',  path: '/resultados' },
  { icon: Settings,        label: 'Configuración', path: '/configuracion' },
]

export default function Sidebar() {
  const navigate            = useNavigate()
  const location            = useLocation()
  const { usuario, clearSession } = useAuth()
  const { speak } = useAccessibility()

  const logout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logoWrap}>
        <div style={s.logoIcon}>S</div>
        <span style={s.logoText}>
          Smart<span style={{ color: 'var(--accent)' }}>Campus</span>
          <span style={{ color: 'var(--yellow)' }}>AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              onMouseEnter={() => speak(label)}
              onFocus={() => speak(label)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.97 }}
              aria-label={`Navegar a ${label}`}
              style={{
                ...s.navItem,
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent-text)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </motion.button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={s.bottom}>
        <ThemeToggle />

        <div style={s.userCard}>
          <div style={s.avatar}>
            {(usuario.nombre || 'U')[0].toUpperCase()}
          </div>
          <div style={s.userInfo}>
            <span style={s.userName}>{usuario.nombre || 'Usuario'}</span>
            <span style={s.userRol}>{usuario.rol || 'viewer'}</span>
          </div>
        </div>

        <motion.button
          onClick={logout}
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
          style={s.logoutBtn}
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </motion.button>
      </div>
    </aside>
  )
}

const s = {
  sidebar: {
    width: 230,
    minHeight: '100vh',
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.25rem 0.85rem',
    gap: 0,
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '1px 0 8px rgba(0,0,0,0.03)',
  },
  logoWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0.25rem 0.5rem 1.75rem',
  },
  logoIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: 'var(--gradient-warm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, color: '#fff', fontSize: 15, flexShrink: 0,
    boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
  },
  logoText: {
    fontWeight: 800, fontSize: '0.95rem',
    color: 'var(--text-primary)',
  },
  nav: {
    display: 'flex', flexDirection: 'column', gap: 3, flex: 1,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
    textAlign: 'left',
    transition: 'all var(--transition)',
    width: '100%',
  },
  bottom: {
    display: 'flex', flexDirection: 'column', gap: 8,
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
    marginTop: '1rem',
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    background: 'var(--bg-subtle)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  avatar: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--yellow))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, color: '#fff', fontSize: '0.8rem', flexShrink: 0,
  },
  userInfo: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  userName: {
    fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userRol: {
    fontSize: '0.7rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'inherit',
    transition: 'all var(--transition)',
    width: '100%',
  },
}
