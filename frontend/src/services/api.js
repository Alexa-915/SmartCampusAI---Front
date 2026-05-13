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

// Si el backend responde 401 (token expirado/inválido), limpiar sesión y redirigir al login
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      // Solo redirigir si no estamos ya en login/register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const register         = (datos) => API.post('/api/auth/register', datos)
export const login            = (datos) => API.post('/api/auth/login', datos)
export const cambiarPassword  = (datos) => API.put('/api/auth/cambiar-password', datos)
export const actualizarPerfil = (datos) => API.put('/api/auth/actualizar-perfil', datos)

// ── Datasets ──────────────────────────────────────────────────────────────
export const getDatasets      = ()          => API.get('/api/datasets/')
export const getDataset       = (id)        => API.get(`/api/datasets/${id}`)
export const crearDataset     = (datos)     => API.post('/api/datasets/', datos)
export const actualizarDataset= (id, datos) => API.put(`/api/datasets/${id}`, datos)
export const eliminarDataset  = (id)        => API.delete(`/api/datasets/${id}`)
export const conteoDataset    = (id)        => API.get(`/api/datasets/${id}/conteo`)

// ── Upload Excel ──────────────────────────────────────────────────────────
export const uploadClases  = (datasetId, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return API.post(`/api/datasets/${datasetId}/upload/clases`, form)
}
export const uploadSalones = (datasetId, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return API.post(`/api/datasets/${datasetId}/upload/salones`, form)
}
export const borrarClasesDataset  = (datasetId) => API.delete(`/api/datasets/${datasetId}/clases`)
export const borrarSalonesDataset = (datasetId) => API.delete(`/api/datasets/${datasetId}/salones`)
export const validarClasesExcel   = (datasetId, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return API.post(`/api/datasets/${datasetId}/validar/clases`, form)
}
export const validarSalonesExcel  = (datasetId, archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return API.post(`/api/datasets/${datasetId}/validar/salones`, form)
}

// ── Clases ────────────────────────────────────────────────────────────────
export const getClases      = (datasetId)        => API.get('/api/clases/', { params: { dataset_id: datasetId } })
export const getClase       = (id)               => API.get(`/api/clases/${id}`)
export const crearClase     = (datos)            => API.post('/api/clases/', datos)
export const actualizarClase= (id, datos)        => API.put(`/api/clases/${id}`, datos)
export const eliminarClase  = (id)               => API.delete(`/api/clases/${id}`)
export const dividirGrupo   = (id)               => API.post(`/api/clases/${id}/dividir`)

// ── Salones ───────────────────────────────────────────────────────────────
export const getSalones      = (datasetId)       => API.get('/api/salones/', { params: { dataset_id: datasetId } })
export const getSalon        = (id)              => API.get(`/api/salones/${id}`)
export const crearSalon      = (datos)           => API.post('/api/salones/', datos)
export const actualizarSalon = (id, datos)       => API.put(`/api/salones/${id}`, datos)
export const eliminarSalon   = (id)              => API.delete(`/api/salones/${id}`)

// ── Solver ────────────────────────────────────────────────────────────────
export const resolverCSP     = (datasetId)       => API.post(`/api/resolver/${datasetId}`)
export const getAsignaciones = (datasetId)       => API.get('/api/asignaciones', { params: { dataset_id: datasetId } })
export const getResumen      = (datasetId)       => API.get('/api/resumen', { params: { dataset_id: datasetId } })
export const getDiagnostico  = (datasetId)       => API.get(`/api/diagnostico/${datasetId}`)
export const getSalonesDisponibles = (asigId)    => API.get(`/api/salones-disponibles/${asigId}`)
export const reasignarClase  = (asigId, datos)   => API.put(`/api/reasignar/${asigId}`, datos)

// ── IA ────────────────────────────────────────────────────────────────────
export const generarClasesIA = (prompt) => API.post('/api/ia/generar-clases', { prompt })
export const extraerTextoPDF = (archivo) => {
  const form = new FormData()
  form.append('archivo', archivo)
  return API.post('/api/pdf/extract-text', form)
}

export default API
