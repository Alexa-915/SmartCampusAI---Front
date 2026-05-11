import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Inicializar desde localStorage para sobrevivir recargas
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario') || 'null')
    } catch {
      return null
    }
  })

  const isAuthenticated = !!token

  // Guardar sesión al hacer login
  const saveSession = useCallback((accessToken, userData) => {
    localStorage.setItem('token', accessToken)
    localStorage.setItem('usuario', JSON.stringify(userData))
    setToken(accessToken)
    setUsuario(userData)
  }, [])

  // Limpiar todo al hacer logout
  const clearSession = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setToken(null)
    setUsuario(null)
  }, [])

  // Actualizar datos del usuario en el estado global (después de editar perfil)
  const updateUsuario = useCallback((nuevosDatos) => {
    setUsuario(prev => {
      const updated = { ...prev, ...nuevosDatos }
      localStorage.setItem('usuario', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, token, usuario, saveSession, clearSession, updateUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
