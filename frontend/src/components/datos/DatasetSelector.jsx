import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Plus, Trash2, FolderOpen } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Alert from '../ui/Alert'
import Badge from '../ui/Badge'

/**
 * Selector de dataset activo con opción de crear y eliminar.
 * datasets: lista de datasets
 * selected: dataset activo
 * onSelect: callback al cambiar
 * onCreate / onDelete: callbacks CRUD
 */
export default function DatasetSelector({ datasets, selected, onSelect, onCreate, onDelete, conteo }) {
  const [open, setOpen]         = useState(false)
  const [modalNew, setModalNew] = useState(false)
  const [nombre, setNombre]     = useState('')
  const [desc, setDesc]         = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return setError('El nombre es obligatorio')
    setLoading(true)
    try {
      await onCreate({ nombre: nombre.trim(), descripcion: desc.trim() || null })
      setNombre('')
      setDesc('')
      setModalNew(false)
      setError('')
    } catch {
      setError('Error al crear el dataset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={s.wrap}>
        {/* Botón selector */}
        <button style={s.selector} onClick={() => setOpen(v => !v)}>
          <FolderOpen size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={s.selectorText}>
            {selected ? selected.nombre : 'Selecciona un dataset'}
          </span>
          {selected && conteo && (
            <span style={s.conteoWrap}>
              <Badge variant="accent">{conteo.clases} clases</Badge>
              <Badge variant="blue">{conteo.salones} salones</Badge>
            </span>
          )}
          <ChevronDown size={14} style={{
            color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--transition)',
          }} />
        </button>

        {/* Botón nuevo dataset */}
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setModalNew(true)}>
          Nuevo
        </Button>
      </div>

      {/* Dropdown de datasets */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            style={s.dropdown}
          >
            {datasets.length === 0 ? (
              <p style={s.emptyDrop}>No hay datasets. Crea uno nuevo.</p>
            ) : (
              datasets.map(ds => (
                <div
                  key={ds.id}
                  style={{
                    ...s.dropItem,
                    background: selected?.id === ds.id ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  <button
                    style={s.dropBtn}
                    onClick={() => { onSelect(ds); setOpen(false) }}
                  >
                    <span style={{
                      fontWeight: selected?.id === ds.id ? 600 : 400,
                      color: selected?.id === ds.id ? 'var(--accent-text)' : 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}>
                      {ds.nombre}
                    </span>
                    {ds.descripcion && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {ds.descripcion}
                      </span>
                    )}
                  </button>
                  {/* Solo mostrar eliminar si no es el seleccionado activo */}
                  <button
                    style={s.deleteBtn}
                    onClick={() => onDelete(ds)}
                    title="Eliminar dataset"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal crear dataset */}
      <Modal open={modalNew} onClose={() => setModalNew(false)} title="Nuevo dataset">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Nombre del dataset"
            placeholder="Ej: Semestre 2025-1"
            value={nombre}
            onChange={setNombre}
            required
          />
          <Input
            label="Descripción (opcional)"
            placeholder="Ej: Prueba con datos reales"
            value={desc}
            onChange={setDesc}
          />
          <Alert type="error" message={error} onClose={() => setError('')} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalNew(false)}>Cancelar</Button>
            <Button type="submit" loading={loading}>Crear dataset</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const s = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    position: 'relative',
  },
  selector: {
    display: 'flex', alignItems: 'center', gap: 8,
    flex: 1,
    padding: '8px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'border-color var(--transition)',
    minWidth: 0,
  },
  selectorText: {
    fontSize: '0.875rem', fontWeight: 500,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  conteoWrap: {
    display: 'flex', gap: 6, flexShrink: 0,
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0, right: 0,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 50,
    overflow: 'hidden',
    maxHeight: 280,
    overflowY: 'auto',
  },
  emptyDrop: {
    padding: '1rem', textAlign: 'center',
    color: 'var(--text-muted)', fontSize: '0.85rem',
  },
  dropItem: {
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    transition: 'background var(--transition)',
  },
  dropBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    gap: 2, padding: '10px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', textAlign: 'left',
  },
  deleteBtn: {
    padding: '8px 12px',
    background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    display: 'flex', transition: 'color var(--transition)',
    flexShrink: 0,
  },
}
