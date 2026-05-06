import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Rutas solo para usuarios NO autenticados (login, register).
 * Si ya hay sesión activa, redirige directo al dashboard.
 * Esto evita que el botón "atrás" lleve al login estando logueado.
 */
export default function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
