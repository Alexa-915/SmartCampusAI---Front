import axios from 'axios'

// En producción usa VITE_API_URL, en local cae al backend local
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
})

// Agregar token automáticamente a cada petición
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const register = (datos) => API.post('/api/auth/register', datos)
export const login    = (datos) => API.post('/api/auth/login', datos)

// Solver
export const resolverCSP      = ()  => API.post('/api/resolver')
export const getAsignaciones  = ()  => API.get('/api/asignaciones')
export const getResumen       = ()  => API.get('/api/resumen')

export default API