import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Datos from './pages/Datos'
import Resultados from './pages/Resultados'
import Configuracion from './pages/Configuracion'
import AsistenteIA from './pages/AsistenteIA'
import PrivateRoute from './router/PrivateRoute'
import PublicRoute from './router/PublicRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Rutas protegidas */}
        <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/datos"         element={<PrivateRoute><Datos /></PrivateRoute>} />
        <Route path="/resultados"    element={<PrivateRoute><Resultados /></PrivateRoute>} />
        <Route path="/configuracion" element={<PrivateRoute><Configuracion /></PrivateRoute>} />
        <Route path="/asistente-ia"  element={<PrivateRoute><AsistenteIA /></PrivateRoute>} />

        {/* Ruta raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
