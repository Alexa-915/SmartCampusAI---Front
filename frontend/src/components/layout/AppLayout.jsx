import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

/** Layout principal con sidebar responsive */
export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar — visible en desktop, overlay en móvil */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div style={s.overlay} onClick={() => setMobileOpen(false)}>
          <div style={s.mobileDrawer} onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={s.main}>
        {/* Botón hamburguesa — solo móvil */}
        <button className="mobile-menu-btn" style={s.menuBtn} onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
        {children}
      </main>

      <style>{`
        .sidebar-desktop { display: block; }
        .mobile-menu-btn { display: none; }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}

const s = {
  main: {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    minWidth: 0,
    position: 'relative',
  },
  menuBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    display: 'none',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    display: 'flex',
  },
  mobileDrawer: {
    width: 240,
    height: '100%',
    overflowY: 'auto',
  },
}
