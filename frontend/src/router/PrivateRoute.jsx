import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Protege rutas que requieren autenticación.
 * Si no hay sesión, redirige al login y guarda a dónde quería ir el usuario.
 */
export default function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // replace: true evita que /dashboard quede en el historial
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
