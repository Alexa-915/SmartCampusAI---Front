import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Datos from './pages/Datos'
import PrivateRoute from './router/PrivateRoute'
import PublicRoute from './router/PublicRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas: redirigen al dashboard si ya hay sesión */}
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Rutas protegidas: redirigen al login si no hay sesión */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/datos"     element={<PrivateRoute><Datos /></PrivateRoute>} />

        {/* Ruta raíz */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
