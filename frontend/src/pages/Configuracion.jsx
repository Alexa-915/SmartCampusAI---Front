import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Settings, Info, Database, Moon, Sun, Eye, EyeOff, Shield, HardDrive, RefreshCw } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useDataset } from '../context/DatasetContext'
import { cambiarPassword, actualizarPerfil } from '../services/api'

export default function Configuracion() {
  const { usuario, updateUsuario } = useAuth()
  const { dark, toggle } = useTheme()
  const { clases, salones, dataset } = useDataset()

  const [seccion, setSeccion] = useState('perfil')
  const [alert, setAlert]     = useState(null)

  // Estado del formulario de perfil
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [email]             = useState(usuario?.email || '')

  // Estado del formulario de contraseña
  const [passActual, setPassActual]   = useState('')
  const [passNueva, setPassNueva]     = useState('')
  const [passConfirm, setPassConfirm] = useState('')

  // Preferencias (localStorage)
  const [prefs, setPrefs] = useState(() => ({
    animaciones: localStorage.getItem('pref_animaciones') !== 'false',
    confirmarEliminar: localStorage.getItem('pref_confirmarEliminar') !== 'false',
    vistaCompacta: localStorage.getItem('pref_vistaCompacta') === 'true',
  }))

  const guardarPref = (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }))
    localStorage.setItem(`pref_${key}`, String(value))
    setAlert({ type: 'success', message: 'Preferencia actualizada' })
  }

  const NAV = [
    { id: 'perfil', icon: User, label: 'Perfil' },
    { id: 'seguridad', icon: Shield, label: 'Seguridad' },
    { id: 'preferencias', icon: Settings, label: 'Preferencias' },
    { id: 'sistema', icon: Info, label: 'Sistema' },
  ]

  return (
    <AppLayout>
      <div style={s.header}>
        <h1 style={s.title}>Configuración</h1>
        <p style={s.sub}>Administra tu perfil y preferencias del sistema</p>
      </div>

      {alert && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <div style={s.layout}>
        {/* Navegación lateral */}
        <Card style={{ padding: '0.5rem', minWidth: 180 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSeccion(id)}
                style={{
                  ...s.navBtn,
                  background: seccion === id ? 'var(--accent-light)' : 'transparent',
                  color: seccion === id ? 'var(--accent-text)' : 'var(--text-secondary)',
                  fontWeight: seccion === id ? 600 : 400,
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Contenido */}
        <div style={{ flex: 1 }}>
          <motion.div
            key={seccion}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── PERFIL ── */}
            {seccion === 'perfil' && (
              <Card>
                <SectionHeader icon={User} title="Perfil del usuario" />
                <div style={s.formGrid}>
                  <div>
                    <Input label="Nombre completo" value={nombre} onChange={setNombre} />
                  </div>
                  <div>
                    <Input label="Correo electrónico" value={email} onChange={() => {}} disabled />
                    <p style={s.hint}>El correo no se puede modificar</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: '1.5rem', alignItems: 'center' }}>
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>Rol:</span>
                    <Badge variant="accent">{usuario?.rol || 'viewer'}</Badge>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: '1.5rem' }}>
                  <Button onClick={async () => {
                    try {
                      await actualizarPerfil({ nombre })
                      updateUsuario({ nombre })
                      setAlert({ type: 'success', message: 'Perfil actualizado correctamente' })
                    } catch (err) {
                      setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al actualizar perfil' })
                    }
                  }}>
                    Guardar cambios
                  </Button>
                  <Button variant="secondary" onClick={() => setNombre(usuario?.nombre || '')}>
                    Cancelar
                  </Button>
                </div>
              </Card>
            )}

            {/* ── SEGURIDAD ── */}
            {seccion === 'seguridad' && (
              <Card>
                <SectionHeader icon={Lock} title="Cambiar contraseña" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 380 }}>
                  <Input
                    label="Contraseña actual"
                    type="password"
                    value={passActual}
                    onChange={setPassActual}
                    icon={Lock}
                  />
                  <Input
                    label="Nueva contraseña"
                    type="password"
                    value={passNueva}
                    onChange={setPassNueva}
                    icon={Lock}
                  />
                  <Input
                    label="Confirmar nueva contraseña"
                    type="password"
                    value={passConfirm}
                    onChange={setPassConfirm}
                    icon={Lock}
                  />
                  {passNueva && passConfirm && passNueva !== passConfirm && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--red)' }}>Las contraseñas no coinciden</p>
                  )}
                  <Button
                    onClick={async () => {
                      if (!passActual || !passNueva) return setAlert({ type: 'error', message: 'Completa todos los campos' })
                      if (passNueva !== passConfirm) return setAlert({ type: 'error', message: 'Las contraseñas no coinciden' })
                      if (passNueva.length < 6) return setAlert({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres' })
                      try {
                        await cambiarPassword({ password_actual: passActual, password_nueva: passNueva })
                        setAlert({ type: 'success', message: 'Contraseña actualizada correctamente' })
                        setPassActual(''); setPassNueva(''); setPassConfirm('')
                      } catch (err) {
                        setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al cambiar contraseña' })
                      }
                    }}
                    disabled={!passActual || !passNueva || passNueva !== passConfirm}
                  >
                    Actualizar contraseña
                  </Button>
                </div>
              </Card>
            )}

            {/* ── PREFERENCIAS ── */}
            {seccion === 'preferencias' && (
              <Card>
                <SectionHeader icon={Settings} title="Preferencias del sistema" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <PrefRow
                    icon={dark ? Moon : Sun}
                    label="Tema de la interfaz"
                    description={dark ? 'Modo oscuro activo' : 'Modo claro activo'}
                  >
                    <Button variant="secondary" size="sm" onClick={toggle}>
                      {dark ? 'Cambiar a claro' : 'Cambiar a oscuro'}
                    </Button>
                  </PrefRow>

                  <PrefRow
                    icon={Eye}
                    label="Animaciones suaves"
                    description="Transiciones y efectos visuales en la interfaz"
                  >
                    <ToggleSwitch checked={prefs.animaciones} onChange={v => guardarPref('animaciones', v)} />
                  </PrefRow>

                  <PrefRow
                    icon={Shield}
                    label="Confirmar antes de eliminar"
                    description="Mostrar diálogo de confirmación al eliminar datos"
                  >
                    <ToggleSwitch checked={prefs.confirmarEliminar} onChange={v => guardarPref('confirmarEliminar', v)} />
                  </PrefRow>

                  <PrefRow
                    icon={Database}
                    label="Vista compacta en tablas"
                    description="Reducir espaciado en las tablas de datos"
                  >
                    <ToggleSwitch checked={prefs.vistaCompacta} onChange={v => guardarPref('vistaCompacta', v)} />
                  </PrefRow>
                </div>
              </Card>
            )}

            {/* ── SISTEMA ── */}
            {seccion === 'sistema' && (
              <Card>
                <SectionHeader icon={Info} title="Información del sistema" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <InfoCard label="Proyecto" value="SmartCampusAI" />
                  <InfoCard label="Versión" value="1.0.0" />
                  <InfoCard label="Estado del backend" value="Conectado" variant="green" />
                  <InfoCard label="Base de datos" value="Supabase PostgreSQL" />
                  <InfoCard label="Dataset activo" value={dataset?.nombre || 'Ninguno'} />
                  <InfoCard label="Clases registradas" value={String(clases?.length || 0)} />
                  <InfoCard label="Salones registrados" value={String(salones?.length || 0)} />
                  <InfoCard label="Tema actual" value={dark ? 'Oscuro' : 'Claro'} />
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Mantenimiento
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => {
                      localStorage.removeItem('pref_animaciones')
                      localStorage.removeItem('pref_confirmarEliminar')
                      localStorage.removeItem('pref_vistaCompacta')
                      setPrefs({ animaciones: true, confirmarEliminar: true, vistaCompacta: false })
                      setAlert({ type: 'success', message: 'Preferencias restablecidas' })
                    }}>
                      Restablecer preferencias
                    </Button>
                    <Button variant="secondary" size="sm" icon={<HardDrive size={13} />} onClick={() => {
                      setAlert({ type: 'info', message: 'Caché local limpiado correctamente' })
                    }}>
                      Limpiar caché local
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}

/* ── Sub-componentes ── */

function SectionHeader({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
        <Icon size={17} />
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
    </div>
  )
}

function PrefRow({ icon: Icon, label, description, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={16} style={{ color: 'var(--text-muted)' }} />
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? 'var(--accent)' : 'var(--border)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background var(--transition)',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', position: 'absolute', top: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

function InfoCard({ label, value, variant }) {
  return (
    <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: variant === 'green' ? 'var(--green)' : 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

const s = {
  header: { marginBottom: '1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  sub: { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  layout: { display: 'flex', gap: '1.5rem', alignItems: 'flex-start' },
  navBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 12px', borderRadius: 'var(--radius-md)',
    border: 'none', cursor: 'pointer', fontSize: '0.85rem',
    fontFamily: 'inherit', textAlign: 'left', width: '100%',
    transition: 'all var(--transition)',
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
  hint: { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 },
  infoRow: { display: 'flex', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: '0.82rem', color: 'var(--text-muted)' },
}
