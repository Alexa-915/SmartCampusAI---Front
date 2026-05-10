import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, CheckCircle, X, RefreshCw, Trash2 } from 'lucide-react'

/**
 * Zona de drag & drop para subir archivos Excel.
 * onUpload: función async que recibe el File
 * onDelete: función async para eliminar los datos cargados
 * label: texto descriptivo (ej: "Clases" o "Salones")
 * alreadyLoaded: boolean — si ya hay datos cargados en el dataset
 * count: número de registros cargados (para mostrar info persistente)
 */
export default function UploadZone({ onUpload, onDelete, label, disabled, alreadyLoaded = false, count = 0 }) {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')
  const inputRef                  = useRef()

  // Sincronizar estado visual con el estado real de los datos
  useEffect(() => {
    if (!alreadyLoaded && count === 0) {
      // Datos eliminados → limpiar todo
      setFile(null)
      setSuccess('')
      setError('')
    } else if (alreadyLoaded && count > 0) {
      // Datos cargados exitosamente → limpiar el archivo temporal y mostrar estado verde
      setFile(null)
      setError('')
      // No setear success aquí — el estado verde viene de alreadyLoaded/showLoaded
    }
  }, [alreadyLoaded, count])

  const handleFile = async (f) => {
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Solo se aceptan archivos .xlsx o .xls')
      return
    }
    setFile(f)
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await onUpload(f)
      // Solo mostrar éxito si hay un mensaje real (no cuando se abre el modal de validación)
      const msg = res.data?.mensaje
      if (msg) setSuccess(msg)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al procesar el archivo')
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFile(e.dataTransfer.files[0])
  }

  const onInputChange = (e) => handleFile(e.target.files[0])

  const reset = () => {
    setFile(null)
    setSuccess('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  // Determinar estado visual
  const showLoaded = !success && !loading && !file && alreadyLoaded

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <motion.div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        animate={{
          borderColor: dragging ? 'var(--accent)' : (success || showLoaded) ? 'var(--green)' : 'var(--border)',
          background:  dragging ? 'var(--accent-light)' : showLoaded ? 'var(--green-light)' : 'var(--bg-subtle)',
        }}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1.5rem',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all var(--transition)',
          minHeight: 110,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={onInputChange}
          disabled={disabled}
        />

        {/* Icono de estado */}
        {success || showLoaded ? (
          <CheckCircle size={24} style={{ color: 'var(--green)' }} />
        ) : file && loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Upload size={24} style={{ color: 'var(--accent)' }} />
          </motion.div>
        ) : (
          <FileSpreadsheet size={24} style={{ color: 'var(--text-muted)' }} />
        )}

        {/* Texto */}
        <div style={{ textAlign: 'center' }}>
          {success ? (
            <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: '0.85rem' }}>{success}</p>
          ) : showLoaded ? (
            <>
              <p style={{ color: 'var(--green-text)', fontWeight: 600, fontSize: '0.85rem' }}>
                {count} {label.toLowerCase()} cargadas
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                <RefreshCw size={10} /> Clic para reemplazar
              </p>
            </>
          ) : file && loading ? (
            <p style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Procesando {file.name}...</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                Subir Excel de {label}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                Arrastra el archivo aquí o haz clic para seleccionar
              </p>
            </>
          )}
        </div>

        {/* Nombre del archivo recién subido */}
        {file && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); reset() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </motion.div>

      {/* Botón eliminar datos — solo aparece si hay datos cargados */}
      {(showLoaded || success) && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--red)',
            fontSize: '0.78rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all var(--transition)',
            width: '100%',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.borderColor = 'var(--red)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <Trash2 size={12} />
          Eliminar {label.toLowerCase()} cargadas
        </button>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {error}
        </p>
      )}
    </div>
  )
}
