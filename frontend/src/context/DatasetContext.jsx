import { createContext, useContext, useState, useCallback } from 'react'
import { getClases, getSalones, conteoDataset } from '../services/api'

/**
 * Contexto global para el dataset activo.
 * Persiste la selección entre navegaciones (Dashboard ↔ Datos).
 * Así el usuario no pierde el contexto al cambiar de pestaña.
 */
const DatasetContext = createContext(null)

export function DatasetProvider({ children }) {
  const [dataset, setDataset]   = useState(null)
  const [clases, setClases]     = useState([])
  const [salones, setSalones]   = useState([])
  const [conteo, setConteo]     = useState(null)
  const [loading, setLoading]   = useState(false)

  // Errores de validación del último upload (para colorear filas)
  const [erroresClases, setErroresClases]   = useState([])
  const [erroresSalones, setErroresSalones] = useState([])

  // Seleccionar un dataset y cargar sus datos
  const seleccionarDataset = useCallback(async (ds) => {
    if (!ds) {
      setDataset(null)
      setClases([])
      setSalones([])
      setConteo(null)
      return
    }

    setDataset(ds)
    setLoading(true)
    try {
      const [cRes, sRes, ctRes] = await Promise.all([
        getClases(ds.id),
        getSalones(ds.id),
        conteoDataset(ds.id),
      ])
      setClases(cRes.data)
      setSalones(sRes.data)
      setConteo(ctRes.data)
    } catch {
      // Si falla, limpiar
      setClases([])
      setSalones([])
      setConteo(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Refrescar datos del dataset actual sin cambiar la selección
  const refrescarTodo = useCallback(async () => {
    if (!dataset) return
    try {
      const [cRes, sRes, ctRes] = await Promise.all([
        getClases(dataset.id),
        getSalones(dataset.id),
        conteoDataset(dataset.id),
      ])
      setClases(cRes.data)
      setSalones(sRes.data)
      setConteo(ctRes.data)
    } catch {
      // silenciar
    }
  }, [dataset])

  // Limpiar todo (al eliminar el dataset activo)
  const limpiar = useCallback(() => {
    setDataset(null)
    setClases([])
    setSalones([])
    setConteo(null)
    setErroresClases([])
    setErroresSalones([])
  }, [])

  return (
    <DatasetContext.Provider value={{
      dataset, clases, salones, conteo, loading,
      seleccionarDataset, refrescarTodo, limpiar,
      setClases, setSalones, setConteo,
      erroresClases, setErroresClases,
      erroresSalones, setErroresSalones,
    }}>
      {children}
    </DatasetContext.Provider>
  )
}

export const useDataset = () => useContext(DatasetContext)
