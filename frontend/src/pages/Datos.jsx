import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, BookOpen, Building2, Search, X, Download, FileText } from 'lucide-react'
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
import ValidacionPreview from '../components/datos/ValidacionPreview'
import { exportarExcel } from '../utils/exportExcel'
import { exportarPDF } from '../utils/exportPDF'
import { useDataset } from '../context/DatasetContext'
import { useAuth } from '../context/AuthContext'
import {
  getDatasets, crearDataset, eliminarDataset,
  crearClase, actualizarClase, eliminarClase, dividirGrupo,
  crearSalon, actualizarSalon, eliminarSalon,
  uploadClases, uploadSalones, borrarClasesDataset, borrarSalonesDataset,
  validarClasesExcel, validarSalonesExcel,
} from '../services/api'

export default function Datos() {
  // ── Estado del contexto global (persiste entre navegaciones) ─────────────
  const {
    dataset, clases, salones, conteo, loading,
    seleccionarDataset, refrescarTodo, limpiar,
    erroresClases, setErroresClases,
    erroresSalones, setErroresSalones,
  } = useDataset()

  // ── Estado local de la página ───────────────────────────────────────────
  const { usuario } = useAuth()
  const [datasets, setDatasets]     = useState([])
  const [tab, setTab]               = useState('clases')
  const [alert, setAlert]           = useState(null)
  const [busqueda, setBusqueda]     = useState('')
  const [filtros, setFiltros]       = useState({ tipo: '', videobeam: '', computadores: '', laboratorio: '' })

  // ── Estado de modales ────────────────────────────────────────────────────
  const [modalClase, setModalClase]   = useState(false)
  const [modalSalon, setModalSalon]   = useState(false)
  const [editClase, setEditClase]     = useState(null)  // null = crear, obj = editar
  const [editSalon, setEditSalon]     = useState(null)

  // Estado de validación de Excel (preview antes de cargar)
  const [modalValidacion, setModalValidacion] = useState(false)
  const [validacionResult, setValidacionResult] = useState(null)
  const [archivoClasesPendiente, setArchivoClasesPendiente] = useState(null)
  const [archivoSalonesPendiente, setArchivoSalonesPendiente] = useState(null)
  const [cargandoValidacion, setCargandoValidacion] = useState(false)
  const [tipoValidacion, setTipoValidacion] = useState('clases') // 'clases' | 'salones'

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

  // ── Leer query param para abrir edición directa desde Dashboard ──────────
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const editarParam = searchParams.get('editar')
    if (editarParam && clases.length > 0) {
      const [materia, grupo] = editarParam.split('|').map(decodeURIComponent)
      const clase = clases.find(c =>
        c.materia === materia && c.grupo === grupo
      )
      if (clase) {
        setTab('clases')
        setEditClase(clase)
        setModalClase(true)
        // Limpiar el param para que no se re-abra al navegar
        setSearchParams({})
      }
    }
  }, [searchParams, clases])

  // ── Cargar datasets al montar ────────────────────────────────────────────
  useEffect(() => { fetchDatasets() }, [])

  // Catálogo literal de horas válidas (mismo que el backend)
  const HORAS_VALIDAS = new Set([
    "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30",
    "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
    "19:00", "19:30", "20:00", "20:30", "21:00",
    "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  ])

  // Re-validar automáticamente cuando cambian los datos
  // Detecta: duplicados (error) + horarios fuera del catálogo (advertencia)
  useEffect(() => {
    if (erroresClases.length > 0 || clases.length > 0) {
      const nuevos = []
      const vistos = {}
      clases.forEach((c, i) => {
        const fila = i + 2

        // Duplicados materia + grupo
        const clave = `${(c.materia || '').toLowerCase()}|${(c.grupo || '').toLowerCase()}`
        if (clave in vistos) {
          nuevos.push({ fila, campo: 'materia/grupo', valor: `${c.materia} - ${c.grupo}`, mensaje: `"${c.materia} - ${c.grupo}" está duplicada.`, tipo: 'error' })
        } else {
          vistos[clave] = fila
        }

        // Horarios fuera del catálogo
        const horario = (c.horario || '').trim()
        if (horario && horario.includes('–')) {
          const partes = horario.split('–')
          const inicio = partes[0]?.trim()
          const fin = partes[1]?.trim()
          if (inicio && !HORAS_VALIDAS.has(inicio)) {
            nuevos.push({ fila, campo: 'horario', valor: inicio, mensaje: `Hora de inicio "${inicio}" no está en el catálogo del sistema.`, tipo: 'advertencia' })
          }
          if (fin && !HORAS_VALIDAS.has(fin)) {
            nuevos.push({ fila, campo: 'horario', valor: fin, mensaje: `Hora de fin "${fin}" no está en el catálogo del sistema.`, tipo: 'advertencia' })
          }
        }
      })
      setErroresClases(nuevos)
    }
  }, [clases])

  useEffect(() => {
    if (erroresSalones.length > 0 || salones.length > 0) {
      const nuevos = []
      const vistos = {}
      salones.forEach((s, i) => {
        const clave = `${(s.codigo || '').toLowerCase()}|${(s.bloque || '').toLowerCase()}`
        if (clave in vistos) {
          nuevos.push({ fila: i + 2, campo: 'codigo/bloque', valor: `${s.codigo} - ${s.bloque}`, mensaje: `"${s.codigo}" en "${s.bloque}" está duplicado.`, tipo: 'error' })
        } else {
          vistos[clave] = i + 2
        }
      })
      setErroresSalones(nuevos)
    }
  }, [salones])

  const fetchDatasets = async () => {
    try {
      const res = await getDatasets()
      setDatasets(res.data)
      // Si hay uno solo y no hay dataset seleccionado, seleccionarlo
      if (res.data.length === 1 && !dataset) seleccionarDataset(res.data[0])
    } catch {
      setAlert({ type: 'error', message: 'No se pudieron cargar los datasets' })
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
        if (dataset?.id === ds.id) limpiar()
        await fetchDatasets()
        setAlert({ type: 'success', message: `Dataset "${ds.nombre}" eliminado` })
      }
    )
  }

  // ── Upload Excel ─────────────────────────────────────────────────────────
  // Clases: valida primero, muestra preview, carga solo si el usuario confirma
  const handleUploadClases = async (archivo) => {
    const res = await validarClasesExcel(dataset.id, archivo)
    setValidacionResult(res.data)
    setArchivoClasesPendiente(archivo)
    setTipoValidacion('clases')
    setModalValidacion(true)
    // Retornar sin mensaje de éxito — el UploadZone no debe mostrar "cargado" todavía
    // El éxito real se muestra después de confirmar en el modal
    return { data: {} }
  }

  const cancelarValidacion = () => {
    setModalValidacion(false)
    setValidacionResult(null)
    setArchivoClasesPendiente(null)
    setArchivoSalonesPendiente(null)
  }

  // Salones: también valida primero
  const handleUploadSalones = async (archivo) => {
    const res = await validarSalonesExcel(dataset.id, archivo)
    setValidacionResult(res.data)
    setArchivoSalonesPendiente(archivo)
    setTipoValidacion('salones')
    setModalValidacion(true)
    return { data: {} }
  }

  // Confirmar carga genérica (funciona para clases y salones)
  const confirmarCarga = async () => {
    setCargandoValidacion(true)
    try {
      if (archivoClasesPendiente) {
        await uploadClases(dataset.id, archivoClasesPendiente)
        // Guardar errores para colorear filas después
        if (validacionResult) {
          setErroresClases([...(validacionResult.errores || []), ...(validacionResult.advertencias || [])])
        }
        setAlert({ type: 'success', message: 'Clases cargadas correctamente' })
      } else if (archivoSalonesPendiente) {
        await uploadSalones(dataset.id, archivoSalonesPendiente)
        if (validacionResult) {
          setErroresSalones([...(validacionResult.errores || []), ...(validacionResult.advertencias || [])])
        }
        setAlert({ type: 'success', message: 'Salones cargados correctamente' })
      }
      await refrescarTodo()
      cancelarValidacion()
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al cargar' })
    } finally {
      setCargandoValidacion(false)
    }
  }

  const handleBorrarClases = () => {
    pedirConfirmacion(
      '¿Eliminar clases?',
      'Se eliminarán todas las clases cargadas en este dataset.',
      async () => {
        cerrarConfirmacion()
        await borrarClasesDataset(dataset.id)
        await refrescarTodo()
        setAlert({ type: 'success', message: 'Clases eliminadas correctamente' })
      }
    )
  }

  const handleBorrarSalones = () => {
    pedirConfirmacion(
      '¿Eliminar salones?',
      'Se eliminarán todos los salones cargados en este dataset.',
      async () => {
        cerrarConfirmacion()
        await borrarSalonesDataset(dataset.id)
        await refrescarTodo()
        setAlert({ type: 'success', message: 'Salones eliminados correctamente' })
      }
    )
  }

  // ── CRUD Clases ──────────────────────────────────────────────────────────
  const handleGuardarClase = async (datos) => {
    const quiereDividir = datos._dividir
    const datosLimpios = { ...datos }
    delete datosLimpios._dividir  // no enviar al backend

    const claseId = editClase?.id  // guardar antes de limpiar el estado

    try {
      if (editClase) {
        await actualizarClase(claseId, datosLimpios)
      } else {
        await crearClase({ ...datosLimpios, dataset_id: dataset.id })
      }

      // Si pidió dividir, ejecutar DESPUÉS de guardar exitosamente
      if (quiereDividir && claseId) {
        const res = await dividirGrupo(claseId)
        setAlert({ type: 'success', message: `Grupo dividido. Se creó "${res.data.materia} - ${res.data.grupo}" con ${res.data.estudiantes} estudiantes.` })
      } else {
        setAlert({ type: 'success', message: editClase ? 'Clase actualizada' : 'Clase creada' })
      }

      setModalClase(false)
      setEditClase(null)
      await refrescarTodo()
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Error al guardar' })
    }
  }

  // Re-validar clases después de editar (solo duplicados materia+grupo)
  const revalidarClases = () => {
    const nuevosErrores = []
    const vistos = {}
    clases.forEach((c, i) => {
      const clave = `${(c.materia || '').toLowerCase()}|${(c.grupo || '').toLowerCase()}`
      if (clave in vistos) {
        nuevosErrores.push({ fila: i + 2, campo: 'materia/grupo', valor: `${c.materia} - ${c.grupo}`, mensaje: `"${c.materia} - ${c.grupo}" está duplicada.`, tipo: 'error' })
      } else {
        vistos[clave] = i + 2
      }
    })
    setErroresClases(nuevosErrores)
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
  // ── Filtrado en tiempo real con filtros combinables ──────────────────────
  // Helper: normaliza texto quitando tildes y pasando a minúsculas
  const norm = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const clasesFiltradas = useMemo(() => {
    let resultado = clases

    // Filtro de texto libre (ignora tildes y mayúsculas)
    if (busqueda.trim()) {
      const q = norm(busqueda)
      resultado = resultado.filter(c =>
        [c.materia, c.grupo, c.profesor, c.tipo, c.horario, c.programa]
          .some(v => norm(v).includes(q))
      )
    }

    // Filtros avanzados
    if (filtros.tipo) {
      resultado = resultado.filter(c => norm(c.tipo) === norm(filtros.tipo))
    }
    if (filtros.videobeam === 'si') resultado = resultado.filter(c => c.requiere_videobeam)
    if (filtros.videobeam === 'no') resultado = resultado.filter(c => !c.requiere_videobeam)
    if (filtros.computadores === 'si') resultado = resultado.filter(c => c.requiere_computadores)
    if (filtros.computadores === 'no') resultado = resultado.filter(c => !c.requiere_computadores)
    if (filtros.laboratorio === 'si') resultado = resultado.filter(c => c.requiere_laboratorio)
    if (filtros.laboratorio === 'no') resultado = resultado.filter(c => !c.requiere_laboratorio)

    return resultado
  }, [clases, busqueda, filtros])

  const salonesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return salones
    const q = norm(busqueda)
    return salones.filter(s =>
      [s.codigo, s.bloque, s.tipologia, String(s.capacidad)]
        .some(v => norm(v).includes(q))
    )
  }, [salones, busqueda])

  const hayFiltrosActivos = busqueda.trim() || Object.values(filtros).some(v => v)

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
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <BookOpen size={22} style={{ color: 'var(--accent)' }} />
          </div>
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
                onDelete={handleBorrarClases}
                disabled={!dataset}
                alreadyLoaded={conteo?.clases_cargadas}
                count={conteo?.clases || 0}
              />
              <UploadZone
                label="Salones"
                onUpload={handleUploadSalones}
                onDelete={handleBorrarSalones}
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
                  Excel
                </Button>

                {/* Exportar a PDF */}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<FileText size={14} />}
                  onClick={() => {
                    const cols = tab === 'clases'
                      ? [
                          { key: 'materia', label: 'Materia' },
                          { key: 'grupo', label: 'Grupo' },
                          { key: 'profesor', label: 'Profesor' },
                          { key: 'tipo', label: 'Tipo' },
                          { key: 'horario', label: 'Horario' },
                          { key: 'estudiantes', label: 'Estudiantes' },
                          { key: 'requiere_videobeam', label: 'Videobeam' },
                          { key: 'requiere_computadores', label: 'Computadores' },
                          { key: 'requiere_laboratorio', label: 'Laboratorio' },
                        ]
                      : [
                          { key: 'codigo', label: 'Código' },
                          { key: 'bloque', label: 'Bloque' },
                          { key: 'capacidad', label: 'Capacidad' },
                          { key: 'tipologia', label: 'Tipología' },
                          { key: 'tiene_videobeam', label: 'Videobeam' },
                          { key: 'tiene_computadores', label: 'Computadores' },
                          { key: 'es_laboratorio', label: 'Laboratorio' },
                        ]
                    const datos = tab === 'clases' ? clasesFiltradas : salonesFiltrados
                    const tipo  = tab === 'clases' ? 'Clases' : 'Salones'

                    exportarPDF({
                      titulo: `Reporte de ${tipo}`,
                      subtitulo: `Listado completo de ${tipo.toLowerCase()} registradas en el sistema`,
                      dataset: dataset?.nombre || '',
                      usuario: usuario?.nombre || '',
                      columns: cols,
                      data: datos,
                      estadisticas: tab === 'clases'
                        ? { 'Total clases': clasesFiltradas.length, 'Con videobeam': clasesFiltradas.filter(c => c.requiere_videobeam).length, 'Con computadores': clasesFiltradas.filter(c => c.requiere_computadores).length, 'Laboratorio': clasesFiltradas.filter(c => c.requiere_laboratorio).length }
                        : { 'Total salones': salonesFiltrados.length, 'Con videobeam': salonesFiltrados.filter(s => s.tiene_videobeam).length, 'Con computadores': salonesFiltrados.filter(s => s.tiene_computadores).length, 'Laboratorios': salonesFiltrados.filter(s => s.es_laboratorio).length },
                      filename: `${tipo.toLowerCase()}_${dataset?.nombre || 'reporte'}`,
                    })
                  }}
                  disabled={(tab === 'clases' ? clasesFiltradas.length : salonesFiltrados.length) === 0}
                >
                  PDF
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
              {hayFiltrosActivos && (
                <button
                  onClick={() => { setBusqueda(''); setFiltros({ tipo: '', videobeam: '', computadores: '', laboratorio: '' }) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
                >
                  <X size={14} />
                </button>
              )}
              {hayFiltrosActivos && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {tab === 'clases' ? clasesFiltradas.length : salonesFiltrados.length} resultado(s)
                </span>
              )}
            </div>

            {/* Filtros avanzados — solo para clases */}
            {tab === 'clases' && (
              <div style={s.filterBar}>
                <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))} style={s.filterSelect}>
                  <option value="">Tipo: Todos</option>
                  <option value="Planta">Planta</option>
                  <option value="Catedrático">Catedrático</option>
                </select>
                <select value={filtros.videobeam} onChange={e => setFiltros(f => ({ ...f, videobeam: e.target.value }))} style={s.filterSelect}>
                  <option value="">Videobeam: Todos</option>
                  <option value="si">Requiere VB</option>
                  <option value="no">No requiere VB</option>
                </select>
                <select value={filtros.computadores} onChange={e => setFiltros(f => ({ ...f, computadores: e.target.value }))} style={s.filterSelect}>
                  <option value="">PC: Todos</option>
                  <option value="si">Requiere PC</option>
                  <option value="no">No requiere PC</option>
                </select>
                <select value={filtros.laboratorio} onChange={e => setFiltros(f => ({ ...f, laboratorio: e.target.value }))} style={s.filterSelect}>
                  <option value="">Lab: Todos</option>
                  <option value="si">Requiere Lab</option>
                  <option value="no">No requiere Lab</option>
                </select>
              </div>
            )}

            {/* Tabla */}
            <div style={{ padding: '0 0 0.5rem' }}>
              {tab === 'clases' ? (
                <Table
                  columns={COLS_CLASES}
                  data={clasesFiltradas}
                  emptyText={busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay clases en este dataset. Sube un Excel o agrega una manualmente.'}
                  rowStatus={(row, i) => {
                    // Mapear errores de validación a filas (fila del Excel = index + 2)
                    const filaExcel = i + 2
                    const err = erroresClases.find(e => e.fila === filaExcel)
                    if (!err) return null
                    return err.tipo === 'error' ? 'error' : 'warning'
                  }}
                />
              ) : (
                <Table
                  columns={COLS_SALONES}
                  data={salonesFiltrados}
                  emptyText={busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay salones en este dataset. Sube un Excel o agrega uno manualmente.'}
                  rowStatus={(row, i) => {
                    const filaExcel = i + 2
                    const err = erroresSalones.find(e => e.fila === filaExcel)
                    if (!err) return null
                    return err.tipo === 'error' ? 'error' : 'warning'
                  }}
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
          onDividir={!!editClase}
          clasesExistentes={clases}
          errorInicial={(() => {
            if (!editClase) return ''
            const idx = clases.findIndex(c => c.id === editClase.id)
            const err = erroresClases.find(e => e.fila === idx + 2)
            return err?.mensaje || ''
          })()}
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
            [...new Set(salones.map(s => s.bloque).filter(Boolean))].sort()
          }
          tipologiasExistentes={
            [...new Set(salones.map(s => s.tipologia).filter(Boolean))].sort()
          }
          salonesExistentes={salones}
        />
      </Modal>

      {/* Modal de validación de Excel */}
      <Modal
        open={modalValidacion}
        onClose={cancelarValidacion}
        title={`Validación del archivo de ${tipoValidacion}`}
        width={700}
      >
        <ValidacionPreview
          resultado={validacionResult}
          onConfirmar={confirmarCarga}
          onCancelar={cancelarValidacion}
          loading={cargandoValidacion}
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
  filterBar: {
    display: 'flex', gap: 8, padding: '0.5rem 1rem',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    flexWrap: 'wrap',
  },
  filterSelect: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '4px 8px',
    fontSize: '0.75rem', color: 'var(--text-secondary)',
    fontFamily: 'inherit', cursor: 'pointer',
  },
}
