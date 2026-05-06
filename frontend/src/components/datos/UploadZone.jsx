import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, FileSpreadsheet, CheckCircle, X } from 'lucide-react'
import Button from '../ui/Button'

/**
 * Zona de drag & drop para subir archivos Excel.
 * onUpload: función async que recibe el File
 * label: texto descriptivo (ej: "Clases" o "Salones")
 */
export default function UploadZone({ onUpload, label, disabled }) {
  const [dragging, setDragging]   = useState(false)
  const [file, setFile]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState('')
  const [error, setError]         = useState('')
  const inputRef                  = useRef()

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
      setSuccess(res.data?.mensaje || 'Archivo cargado correctamente')
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
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const onInputChange = (e) => handleFile(e.target.files[0])

  const reset = () => {
    setFile(null)
    setSuccess('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <motion.div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        animate={{
          borderColor: dragging ? 'var(--accent)' : success ? 'var(--green)' : 'var(--border)',
          background:  dragging ? 'var(--accent-light)' : 'var(--bg-subtle)',
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
        {success ? (
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

        {/* Nombre del archivo cargado */}
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

      {/* Error */}
      {error && (
        <p style={{ fontSize: '0.78rem', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {error}
        </p>
      )}
    </div>
  )
}
