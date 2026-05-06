import Sidebar from './Sidebar'

/** Layout principal con sidebar para páginas autenticadas */
export default function AppLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: '2rem 2.5rem',
        overflowY: 'auto',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  )
}
