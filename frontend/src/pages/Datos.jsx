import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, BookOpen, Building2, Search, X, Download } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Modal from '../components/ui/Modal'
import Table from '../components/ui/Table'
import Loader from '../components/ui/Loader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import DatasetSelector from '../components/datos/DatasetSelector'
import UploadZone from '../components/datos/UploadZone'
import ClaseForm from '../components/datos/ClaseForm'
import SalonForm from '../components/datos/SalonForm'
import { exportarExcel } from '../utils/exportExcel'
import {
  getDatasets, crearDataset, eliminarDataset, conteoDataset,
  getClases, crearClase, actualizarClase, eliminarClase,
  getSalones, crearSalon, actualizarSalon, eliminarSalon,
  uploadClases, uploadSalones,
} from '../services/api'

export default function Datos() {
  // ── Estado global de la página ──────────────────────────────────────────
  const [datasets, setDatasets]     = useState([])
  const [dataset, setDataset]       = useState(null)   // dataset activo
  const [conteo, setConteo]         = useState(null)
  const [tab, setTab]               = useState('clases') // 'clases' | 'salones'
  const [clases, setClases]         = useState([])
  const [salones, setSalones]       = useState([])
  const [loading, setLoading]       = useState(false)
  const [alert, setAlert]           = useState(null)
  const [busqueda, setBusqueda]     = useState('')  // filtro de búsqueda

  // ── Estado de modales ────────────────────────────────────────────────────
  const [modalClase, setModalClase]   = useState(false)
  const [modalSalon, setModalSalon]   = useState(false)
  const [editClase, setEditClase]     = useState(null)  // null = crear, obj = editar
  const [editSalon, setEditSalon]     = useState(null)

  // Estado del diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    open: false, title: '', message: '', onConfirm: null,
  })

  const pedirConfirmacion = (title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm })
  }
  const cerrarConfirmacion = () => {
    setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })
  }

  // ── Cargar datasets al montar ────────────────────────────────────────────
  useEffect(() => { fetchDatasets() }, [])

  const fetchDatasets = async () => {
    try {
      const res = await getDatasets()
      setDatasets(res.data)
      // Si solo hay uno, seleccionarlo automáticamente
      if (res.data.length === 1) seleccionarDataset(res.data[0])
    } catch {
      setAlert({ type: 'error', message: 'No se pudieron cargar los datasets' })
    }
  }

  // Cargar datos del dataset seleccionado
  const seleccionarDataset = useCallback(async (ds) => {
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
      setAlert({ type: 'error', message: 'Error al cargar los datos del dataset' })
    } finally {
      setLoading(false)
    }
  }, [])

  // Refrescar ambas listas y el conteo (usado después de uploads y CRUD)
  const refrescarTodo = async (dsId) => {
    const id = dsId ?? dataset?.id
    if (!id) return
    try {
      const [cRes, sRes, ctRes] = await Promise.all([
        getClases(id),
        getSalones(id),
        conteoDataset(id),
      ])
      setClases(cRes.data)
      setSalones(sRes.data)
      setConteo(ctRes.data)
    } catch {
      setAlert({ type: 'error', message: 'Error al actualizar los datos' })
    }
  }

  // Refrescar solo la pestaña activa (para operaciones CRUD individuales)
  const refrescarTab = async () => {
    if (!dataset) return
    try {
      if (tab === 'clases') {
        const res = await getClases(dataset.id)
        setClases(res.data)
      } else {
        const res = await getSalones(dataset.id)
        setSalones(res.data)
      }
      const ct = await conteoDataset(dataset.id)
      setConteo(ct.data)
    } catch {
      setAlert({ type: 'error', message: 'Error al actualizar los datos' })
    }
  }

  // ── CRUD Datasets ────────────────────────────────────────────────────────
  const handleCrearDataset = async (datos) => {
    const res = await crearDataset(datos)
    await fetchDatasets()
    seleccionarDataset(res.data)
    setAlert({ type: 'success', message: `Dataset "${res.data.nombre}" creado` })
  }

  const handleEliminarDataset = async (ds) => {
    pedirConfirmacion(
      '¿Eliminar dataset?',
      `Se eliminará "${ds.nombre}" junto con todas sus clases y salones. Esta acción no se puede deshacer.`,
      async () => {
        cerrarConfirmacion()
        await eliminarDataset(ds.id)
        if (dataset?.id === ds.id) {
          setDataset(null)
          setClases([])
          setSalones([])
          setConteo(null)
        }
        await fetchDatasets()
        setAlert({ type: 'success', message: `Dataset "${ds.nombre}" eliminado` })
      }
    )
  }

  // ── Upload Excel ─────────────────────────────────────────────────────────
  const handleUploadClases = async (archivo) => {
    const res = await uploadClases(dataset.id, archivo)
    await refrescarTodo()   // refresca ambas listas para mantener conteos correctos
    return res
  }

  const handleUploadSalones = async (archivo) => {
    const res = await uploadSalones(dataset.id, archivo)
    await refrescarTodo()   // ídem
    return res
  }

  // ── CRUD Clases ──────────────────────────────────────────────────────────
  const handleGuardarClase = async (datos) => {
    if (editClase) {
      await actualizarClase(editClase.id, datos)
      setAlert({ type: 'success', message: 'Clase actualizada' })
    } else {
      await crearClase({ ...datos, dataset_id: dataset.id })
      setAlert({ type: 'success', message: 'Clase creada' })
    }
    setModalClase(false)
    setEditClase(null)
    await refrescarTodo()
  }

  const handleEliminarClase = async (clase) => {
    pedirConfirmacion(
      '¿Eliminar clase?',
      `Se eliminará "${clase.materia} - ${clase.grupo}" de este dataset.`,
      async () => {
        cerrarConfirmacion()
        await eliminarClase(clase.id)
        await refrescarTodo()
        setAlert({ type: 'success', message: 'Clase eliminada' })
      }
    )
  }

  // ── CRUD Salones ─────────────────────────────────────────────────────────
  const handleGuardarSalon = async (datos) => {
    if (editSalon) {
      await actualizarSalon(editSalon.id, datos)
      setAlert({ type: 'success', message: 'Salón actualizado' })
    } else {
      await crearSalon({ ...datos, dataset_id: dataset.id })
      setAlert({ type: 'success', message: 'Salón creado' })
    }
    setModalSalon(false)
    setEditSalon(null)
    // Refrescar todo para que bloques/tipologías nuevas aparezcan inmediatamente
    await refrescarTodo()
  }

  const handleEliminarSalon = async (salon) => {
    pedirConfirmacion(
      '¿Eliminar salón?',
      `Se eliminará el salón "${salon.codigo}" de este dataset.`,
      async () => {
        cerrarConfirmacion()
        await eliminarSalon(salon.id)
        await refrescarTodo()
        setAlert({ type: 'success', message: 'Salón eliminado' })
      }
    )
  }

  // ── Columnas de las tablas ───────────────────────────────────────────────
  const accionesClase = (row) => (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={btnIcon} onClick={() => { setEditClase(row); setModalClase(true) }} title="Editar">
        <Pencil size={13} />
      </button>
      <button style={{ ...btnIcon, color: 'var(--red)' }} onClick={() => handleEliminarClase(row)} title="Eliminar">
        <Trash2 size={13} />
      </button>
    </div>
  )

  const accionesSalon = (row) => (
    <div style={{ display: 'flex', gap: 4 }}>
      <button style={btnIcon} onClick={() => { setEditSalon(row); setModalSalon(true) }} title="Editar">
        <Pencil size={13} />
      </button>
      <button style={{ ...btnIcon, color: 'var(--red)' }} onClick={() => handleEliminarSalon(row)} title="Eliminar">
        <Trash2 size={13} />
      </button>
    </div>
  )

  const COLS_CLASES = [
    { key: 'materia',    label: 'Materia' },
    { key: 'grupo',      label: 'Grupo' },
    { key: 'profesor',   label: 'Profesor' },
    { key: 'tipo',       label: 'Tipo' },
    { key: 'horario',    label: 'Horario' },
    { key: 'estudiantes',label: 'Est.' },
    { key: 'req', label: 'Requisitos', render: (r) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {r.requiere_videobeam    && <Badge variant="blue">VB</Badge>}
        {r.requiere_computadores && <Badge variant="accent">PC</Badge>}
        {r.requiere_laboratorio  && <Badge variant="yellow">Lab</Badge>}
        {!r.requiere_videobeam && !r.requiere_computadores && !r.requiere_laboratorio && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
        )}
      </div>
    )},
    { key: 'acciones', label: '', render: accionesClase },
  ]

  const COLS_SALONES = [
    { key: 'codigo',    label: 'Código' },
    { key: 'bloque',    label: 'Bloque' },
    { key: 'capacidad', label: 'Capacidad' },
    { key: 'tipologia', label: 'Tipología' },
    { key: 'equip', label: 'Equipamiento', render: (r) => (
      <div style={{ display: 'flex', gap: 4 }}>
        {r.tiene_videobeam    && <Badge variant="blue">VB</Badge>}
        {r.tiene_computadores && <Badge variant="accent">PC</Badge>}
        {r.es_laboratorio     && <Badge variant="yellow">Lab</Badge>}
        {!r.tiene_videobeam && !r.tiene_computadores && !r.es_laboratorio && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
        )}
      </div>
    )},
    { key: 'acciones', label: '', render: accionesSalon },
  ]

  // ── Filtrado en tiempo real ──────────────────────────────────────────────
  // Busca en todos los campos de texto de cada fila
  const clasesFiltradas = useMemo(() => {
    if (!busqueda.trim()) return clases
    const q = busqueda.toLowerCase()
    return clases.filter(c =>
      [c.materia, c.grupo, c.profesor, c.tipo, c.horario, c.programa]
        .some(v => v?.toLowerCase().includes(q))
    )
  }, [clases, busqueda])

  const salonesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return salones
    const q = busqueda.toLowerCase()
    return salones.filter(s =>
      [s.codigo, s.bloque, s.tipologia, String(s.capacidad)]
        .some(v => v?.toLowerCase().includes(q))
    )
  }, [salones, busqueda])

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Gestión de Datos</h1>
          <p style={s.sub}>Administra los datasets de clases y salones</p>
        </div>
      </div>

      {/* Alert global */}
      <div style={{ marginBottom: alert ? '1rem' : 0 }}>
        <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />
      </div>

      {/* Selector de dataset */}
      <Card style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <p style={s.sectionLabel}>Dataset activo</p>
        <DatasetSelector
          datasets={datasets}
          selected={dataset}
          onSelect={seleccionarDataset}
          onCreate={handleCrearDataset}
          onDelete={handleEliminarDataset}
          conteo={conteo}
        />
      </Card>

      {/* Contenido principal — solo si hay dataset seleccionado */}
      {!dataset ? (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📂</p>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Ningún dataset seleccionado
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Crea un dataset nuevo o selecciona uno existente para comenzar.
          </p>
        </Card>
      ) : loading ? (
        <Loader text="Cargando datos..." />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Upload de archivos */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <p style={s.sectionLabel}>Cargar archivos Excel</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <UploadZone
                label="Clases"
                onUpload={handleUploadClases}
                disabled={!dataset}
                alreadyLoaded={conteo?.clases_cargadas}
                count={conteo?.clases || 0}
              />
              <UploadZone
                label="Salones"
                onUpload={handleUploadSalones}
                disabled={!dataset}
                alreadyLoaded={conteo?.salones_cargados}
                count={conteo?.salones || 0}
              />
            </div>
          </Card>

          {/* Tabs + tabla */}
          <Card padding="0">
            {/* Tab bar */}
            <div style={s.tabBar}>
              <TabBtn
                active={tab === 'clases'}
                onClick={() => { setTab('clases'); setBusqueda('') }}
                icon={<BookOpen size={15} />}
                label="Clases"
                count={conteo?.clases}
              />
              <TabBtn
                active={tab === 'salones'}
                onClick={() => { setTab('salones'); setBusqueda('') }}
                icon={<Building2 size={15} />}
                label="Salones"
                count={conteo?.salones}
              />
              <div style={{ flex: 1 }} />
              {/* Botones de acción */}
              <div style={{ padding: '0.6rem 1rem', display: 'flex', gap: 8 }}>
                {/* Exportar a Excel */}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Download size={14} />}
                  onClick={() => {
                    if (tab === 'clases' && clasesFiltradas.length > 0) {
                      exportarExcel(clasesFiltradas, [
                        { key: 'materia', label: 'Materia' },
                        { key: 'grupo', label: 'Grupo' },
                        { key: 'profesor', label: 'Profesor' },
                        { key: 'tipo', label: 'Tipo' },
                        { key: 'horario', label: 'Horario' },
                        { key: 'estudiantes', label: 'Estudiantes' },
                        { key: 'requiere_videobeam', label: 'Requiere Videobeam' },
                        { key: 'requiere_computadores', label: 'Requiere Computadores' },
                        { key: 'requiere_laboratorio', label: 'Requiere Laboratorio' },
                      ], `clases_${dataset?.nombre || 'export'}`)
                    } else if (tab === 'salones' && salonesFiltrados.length > 0) {
                      exportarExcel(salonesFiltrados, [
                        { key: 'codigo', label: 'Código' },
                        { key: 'bloque', label: 'Bloque' },
                        { key: 'capacidad', label: 'Capacidad' },
                        { key: 'tipologia', label: 'Tipología' },
                        { key: 'tiene_videobeam', label: 'Tiene Videobeam' },
                        { key: 'tiene_computadores', label: 'Tiene Computadores' },
                        { key: 'es_laboratorio', label: 'Es Laboratorio' },
                      ], `salones_${dataset?.nombre || 'export'}`)
                    }
                  }}
                  disabled={(tab === 'clases' ? clasesFiltradas.length : salonesFiltrados.length) === 0}
                >
                  Exportar
                </Button>

                {/* Agregar */}
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={() => {
                    if (tab === 'clases') { setEditClase(null); setModalClase(true) }
                    else                  { setEditSalon(null); setModalSalon(true) }
                  }}
                >
                  Agregar {tab === 'clases' ? 'clase' : 'salón'}
                </Button>
              </div>
            </div>

            {/* Barra de búsqueda */}
            <div style={s.searchBar}>
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder={tab === 'clases'
                  ? 'Buscar por materia, profesor, grupo, horario...'
                  : 'Buscar por código, bloque, tipología...'}
                style={s.searchInput}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
              {busqueda && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {tab === 'clases' ? clasesFiltradas.length : salonesFiltrados.length} resultado(s)
                </span>
              )}
            </div>

            {/* Tabla */}
            <div style={{ padding: '0 0 0.5rem' }}>
              {tab === 'clases' ? (
                <Table
                  columns={COLS_CLASES}
                  data={clasesFiltradas}
                  emptyText={busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay clases en este dataset. Sube un Excel o agrega una manualmente.'}
                />
              ) : (
                <Table
                  columns={COLS_SALONES}
                  data={salonesFiltrados}
                  emptyText={busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay salones en este dataset. Sube un Excel o agrega uno manualmente.'}
                />
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Modal Clase */}
      <Modal
        open={modalClase}
        onClose={() => { setModalClase(false); setEditClase(null) }}
        title={editClase ? 'Editar clase' : 'Nueva clase'}
        width={580}
      >
        <ClaseForm
          inicial={editClase}
          onSubmit={handleGuardarClase}
          onCancel={() => { setModalClase(false); setEditClase(null) }}
        />
      </Modal>

      {/* Modal Salón */}
      <Modal
        open={modalSalon}
        onClose={() => { setModalSalon(false); setEditSalon(null) }}
        title={editSalon ? 'Editar salón' : 'Nuevo salón'}
        width={520}
      >
        <SalonForm
          inicial={editSalon}
          onSubmit={handleGuardarSalon}
          onCancel={() => { setModalSalon(false); setEditSalon(null) }}
          bloquesExistentes={
            // Extraer bloques únicos del dataset actual, ignorar nulos/vacíos
            [...new Set(salones.map(s => s.bloque).filter(Boolean))].sort()
          }
          tipologiasExistentes={
            // Extraer tipologías únicas del dataset actual, ignorar nulos/vacíos
            [...new Set(salones.map(s => s.tipologia).filter(Boolean))].sort()
          }
        />
      </Modal>

      {/* Diálogo de confirmación estilizado */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={cerrarConfirmacion}
      />
    </AppLayout>
  )
}

// ── Componentes locales ──────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '0.85rem 1.25rem',
        background: 'none', border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--accent-text)' : 'var(--text-muted)',
        fontWeight: active ? 600 : 400,
        fontSize: '0.875rem', cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all var(--transition)',
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <Badge variant={active ? 'accent' : 'default'}>{count}</Badge>
      )}
    </button>
  )
}

const btnIcon = {
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer',
  padding: '4px 6px', borderRadius: 6,
  display: 'flex', transition: 'color var(--transition)',
}

const s = {
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem',
  },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 },
  sub:   { color: 'var(--text-secondary)', fontSize: '0.875rem' },
  sectionLabel: {
    fontSize: '0.75rem', fontWeight: 600,
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '0.75rem',
  },
  tabBar: {
    display: 'flex', alignItems: 'center',
    borderBottom: '1px solid var(--border)',
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '0.6rem 1rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-subtle)',
  },
  searchInput: {
    flex: 1, border: 'none', background: 'transparent',
    fontSize: '0.875rem', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit',
  },
}
