from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asignacion import Asignacion
from app.models.clase import Clase
from app.models.salon import Salon
from app.models.dataset import Dataset
from app.schemas.asignacion import AsignacionOut
import sys
import os

# El motor CSP vive dentro del repo en backend/csp_engine/
CSP_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "csp_engine")
sys.path.insert(0, os.path.abspath(CSP_ROOT))

from src.csp.solver import resolver_csp

router = APIRouter(prefix="/api", tags=["solver"])


def _clases_a_dict(clases: list[Clase]) -> list[dict]:
    """
    Convierte los objetos Clase de la BD al formato que espera el solver.
    El solver necesita exactamente estos nombres de clave.
    """
    return [
        {
            "materia":               c.materia,
            "grupo":                 c.grupo,
            "profesor":              c.profesor,
            "tipo":                  c.tipo,
            "horario":               c.horario,
            "estudiantes":           c.estudiantes,
            "requiere_videobeam":    c.requiere_videobeam,
            "requiere_computadores": c.requiere_computadores,
            "requiere_laboratorio":  c.requiere_laboratorio,
        }
        for c in clases
    ]


def _salones_a_dict(salones: list[Salon]) -> list[dict]:
    """
    Convierte los objetos Salon de la BD al formato que espera el solver.
    El solver usa "id" como identificador del salón (el código, ej: "A-101").
    """
    return [
        {
            "id":                 s.codigo,
            "bloque":             s.bloque,
            "capacidad":          s.capacidad,
            "tipologia":          s.tipologia,
            "tiene_videobeam":    s.tiene_videobeam,
            "tiene_computadores": s.tiene_computadores,
            "es_laboratorio":     s.es_laboratorio,
        }
        for s in salones
    ]


def _validar_datos_entrada(clases: list[dict], salones: list[dict]) -> list[dict]:
    """
    Valida los datos ANTES de correr el solver.
    Detecta problemas que harán imposible asignar ciertas clases.
    """
    from collections import Counter
    advertencias = []

    cap_maxima = max((s["capacidad"] for s in salones), default=0)
    salones_con_pc  = [s for s in salones if s["tiene_computadores"]]
    salones_lab     = [s for s in salones if s["es_laboratorio"]]

    # 1. Profesor con más de 5 clases en el mismo horario exacto
    prof_horario = Counter()
    for c in clases:
        prof_horario[(c["profesor"], c["horario"])] += 1

    for (prof, horario), count in prof_horario.items():
        if count > 5:
            advertencias.append({
                "tipo": "profesor_saturado",
                "mensaje": f"El profesor '{prof}' tiene {count} clases en el horario {horario} (máximo 5 días hábiles).",
                "severidad": "error",
            })

    # 2. Clases con más estudiantes que el salón más grande
    for c in clases:
        if int(c["estudiantes"]) > cap_maxima:
            advertencias.append({
                "tipo": "sin_capacidad",
                "mensaje": f"'{c['materia']} - {c['grupo']}' tiene {c['estudiantes']} estudiantes pero el salón más grande tiene {cap_maxima}.",
                "severidad": "error",
            })

    # 3. Clases que requieren PC pero no hay salones con PC
    if not salones_con_pc:
        clases_pc = [c for c in clases if c["requiere_computadores"]]
        if clases_pc:
            advertencias.append({
                "tipo": "sin_pc",
                "mensaje": f"Hay {len(clases_pc)} clases que requieren computadores pero no existe ningún salón con PC.",
                "severidad": "error",
            })

    # 4. Clases que requieren laboratorio pero no hay labs
    if not salones_lab:
        clases_lab = [c for c in clases if c["requiere_laboratorio"]]
        if clases_lab:
            advertencias.append({
                "tipo": "sin_laboratorio",
                "mensaje": f"Hay {len(clases_lab)} clases que requieren laboratorio pero no existe ningún laboratorio.",
                "severidad": "error",
            })

    for a in advertencias:
        print(f"⚠️  {a['mensaje']}")

    return advertencias


@router.post("/resolver/{dataset_id}")
def resolver(dataset_id: int, db: Session = Depends(get_db)):
    """
    Corre el solver CSP usando los datos del dataset indicado
    y guarda los resultados en la tabla de asignaciones.
    """
    # Verificar que el dataset existe
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    # Cargar clases y salones desde la BD
    clases_bd  = db.query(Clase).filter(Clase.dataset_id == dataset_id).all()
    salones_bd = db.query(Salon).filter(Salon.dataset_id == dataset_id).all()

    if not clases_bd:
        raise HTTPException(status_code=400, detail="El dataset no tiene clases cargadas")
    if not salones_bd:
        raise HTTPException(status_code=400, detail="El dataset no tiene salones cargados")

    # Convertir al formato que espera el solver
    clases  = _clases_a_dict(clases_bd)
    salones = _salones_a_dict(salones_bd)

    # Correr el solver
    resultado = resolver_csp(clases, salones)

    # Limpiar asignaciones anteriores de este dataset y guardar las nuevas
    db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).delete()

    for a in resultado["asignadas"]:
        db.add(Asignacion(
            dataset_id      = dataset_id,
            materia         = a["materia"],
            grupo           = a["grupo"],
            profesor        = a["profesor"],
            tipo            = a["tipo"],
            horario         = a["horario"],
            estudiantes     = int(a["estudiantes"]),
            dia_asignado    = a["dia_asignado"],
            salon_asignado  = a["salon_asignado"],
            bloque_salon    = a["bloque_salon"],
            capacidad_salon = a["capacidad_salon"],
            desperdicio     = a["desperdicio"],
            requiere_vb     = bool(a.get("requiere_videobeam", False)),
            requiere_pc     = bool(a.get("requiere_computadores", False)),
            requiere_lab    = bool(a.get("requiere_laboratorio", False)),
        ))
    db.commit()

    total_clases = len(clases)
    return {
        "dataset_id":   dataset_id,
        "asignadas":    len(resultado["asignadas"]),
        "no_asignadas": len(resultado["no_asignadas"]),
        "pct_exito":    round(len(resultado["asignadas"]) / total_clases * 100, 1),
        "advertencias_previas": _validar_datos_entrada(clases, salones),
    }


@router.get("/asignaciones", response_model=list[AsignacionOut])
def get_asignaciones(dataset_id: int, db: Session = Depends(get_db)):
    """Devuelve todas las asignaciones de un dataset. Requiere ?dataset_id=X"""
    return db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).all()


@router.get("/resumen")
def get_resumen(dataset_id: int, db: Session = Depends(get_db)):
    """Devuelve estadísticas avanzadas del resultado del solver para un dataset."""
    from sqlalchemy import func as sql_func
    from collections import Counter

    # Datos base
    asignaciones = db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).all()
    total_clases = db.query(Clase).filter(Clase.dataset_id == dataset_id).count()
    total_salones = db.query(Salon).filter(Salon.dataset_id == dataset_id).count()
    total_asignadas = len(asignaciones)
    no_asignadas = total_clases - total_asignadas

    # Distribución por día
    por_dia = {}
    for dia in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]:
        por_dia[dia] = sum(1 for a in asignaciones if a.dia_asignado == dia)

    # Salón más utilizado
    salones_uso = Counter(a.salon_asignado for a in asignaciones)
    salon_top = salones_uso.most_common(1)[0] if salones_uso else ("—", 0)

    # Bloque más utilizado
    bloques_uso = Counter(a.bloque_salon for a in asignaciones if a.bloque_salon)
    bloque_top = bloques_uso.most_common(1)[0] if bloques_uso else ("—", 0)

    # Día más cargado
    dia_top = max(por_dia, key=por_dia.get) if por_dia else "—"

    # Desperdicio promedio de capacidad
    desperdicios = [a.desperdicio for a in asignaciones if a.desperdicio is not None]
    desperdicio_promedio = round(sum(desperdicios) / len(desperdicios), 1) if desperdicios else 0

    # Porcentaje de ocupación (salones únicos usados / total salones)
    salones_usados = len(set(a.salon_asignado for a in asignaciones))
    pct_ocupacion = round(salones_usados / max(total_salones, 1) * 100, 1)

    # Distribución por bloque
    por_bloque = dict(bloques_uso.most_common(10))

    # Horarios más cargados
    horarios_uso = Counter(a.horario for a in asignaciones)
    horarios_top = dict(horarios_uso.most_common(5))

    # Clases no asignadas (las que están en Clase pero no en Asignacion)
    clases_bd = db.query(Clase).filter(Clase.dataset_id == dataset_id).all()
    claves_asignadas = set(f"{a.materia}|{a.grupo}" for a in asignaciones)
    clases_sin_asignar = [
        {"materia": c.materia, "grupo": c.grupo, "profesor": c.profesor,
         "horario": c.horario, "estudiantes": c.estudiantes}
        for c in clases_bd
        if f"{c.materia}|{c.grupo}" not in claves_asignadas
    ]

    # Porcentaje de éxito
    pct_exito = round(total_asignadas / max(total_clases, 1) * 100, 1)

    return {
        "dataset_id":         dataset_id,
        "total_clases":       total_clases,
        "total_salones":      total_salones,
        "total_asignadas":    total_asignadas,
        "no_asignadas":       no_asignadas,
        "pct_exito":          pct_exito,
        "por_dia":            por_dia,
        "salon_top":          {"nombre": salon_top[0], "usos": salon_top[1]},
        "bloque_top":         {"nombre": bloque_top[0], "usos": bloque_top[1]},
        "dia_top":            dia_top,
        "desperdicio_promedio": desperdicio_promedio,
        "pct_ocupacion":      pct_ocupacion,
        "salones_usados":     salones_usados,
        "por_bloque":         por_bloque,
        "horarios_top":       horarios_top,
        "clases_sin_asignar": clases_sin_asignar[:20],  # máximo 20 para no sobrecargar
        "total_sin_asignar":  len(clases_sin_asignar),
    }


@router.get("/diagnostico/{dataset_id}")
def diagnostico_solver(dataset_id: int, db: Session = Depends(get_db)):
    """
    Analiza en detalle por qué cada clase no fue asignada.
    Evalúa cada restricción individualmente para dar un diagnóstico preciso.
    """
    from src.csp.restricciones import es_valida_asignacion, profesor_disponible
    from src.utils.horarios import horario_dentro_de_jornada, horarios_se_solapan

    # Cargar datos
    asignaciones = db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).all()
    clases_bd    = db.query(Clase).filter(Clase.dataset_id == dataset_id).all()
    salones_bd   = db.query(Salon).filter(Salon.dataset_id == dataset_id).all()

    if not clases_bd or not salones_bd:
        return {"diagnosticos": [], "patrones": [], "recomendaciones": []}

    # Convertir a dicts para usar las funciones del CSP
    salones_dict = _salones_a_dict(salones_bd)

    # Identificar clases no asignadas
    claves_asignadas = set(f"{a.materia}|{a.grupo}" for a in asignaciones)
    clases_no_asignadas = [c for c in clases_bd if f"{c.materia}|{c.grupo}" not in claves_asignadas]

    # Construir mapa de ocupación (qué salones están ocupados en qué horarios/días)
    ocupacion = {}  # salon_id → [(dia, horario)]
    for a in asignaciones:
        if a.salon_asignado not in ocupacion:
            ocupacion[a.salon_asignado] = []
        ocupacion[a.salon_asignado].append((a.dia_asignado, a.horario))

    # Diagnosticar cada clase no asignada
    diagnosticos = []
    conteo_razones = {
        "capacidad": 0,
        "videobeam": 0,
        "computadores": 0,
        "laboratorio": 0,
        "horario_profesor": 0,
        "todos_ocupados": 0,
        "horario_invalido": 0,
    }

    for clase in clases_no_asignadas:
        clase_dict = {
            "materia": clase.materia, "grupo": clase.grupo,
            "profesor": clase.profesor, "tipo": clase.tipo,
            "horario": clase.horario, "estudiantes": clase.estudiantes,
            "requiere_videobeam": clase.requiere_videobeam,
            "requiere_computadores": clase.requiere_computadores,
            "requiere_laboratorio": clase.requiere_laboratorio,
        }

        razones = []
        salones_compatibles = 0
        salones_con_capacidad = 0
        salones_con_equipo = 0
        salones_disponibles = 0

        # Verificar horario válido
        if not horario_dentro_de_jornada(clase.horario or ""):
            razones.append("Horario fuera de la jornada universitaria (6:00–21:00)")
            conteo_razones["horario_invalido"] += 1

        # Verificar disponibilidad del profesor
        if not profesor_disponible(clase_dict):
            razones.append(f"Profesor '{clase.profesor}' ({clase.tipo}) no disponible en horario {clase.horario}")
            conteo_razones["horario_profesor"] += 1

        # Evaluar cada salón
        for salon in salones_dict:
            # Capacidad
            tiene_capacidad = salon["capacidad"] >= clase.estudiantes
            if tiene_capacidad:
                salones_con_capacidad += 1

            # Equipamiento
            equipo_ok = True
            if clase.requiere_videobeam and not salon["tiene_videobeam"]:
                equipo_ok = False
            if clase.requiere_computadores and not salon["tiene_computadores"]:
                equipo_ok = False
            if clase.requiere_laboratorio and not salon["es_laboratorio"]:
                equipo_ok = False
            if equipo_ok:
                salones_con_equipo += 1

            # Compatible (capacidad + equipo)
            if tiene_capacidad and equipo_ok:
                salones_compatibles += 1

                # Verificar disponibilidad en los 5 días
                disponible_algun_dia = False
                for dia in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]:
                    ocupados_ese_dia = [h for (d, h) in ocupacion.get(salon["id"], []) if d == dia]
                    conflicto = any(horarios_se_solapan(clase.horario, h) for h in ocupados_ese_dia)
                    if not conflicto:
                        disponible_algun_dia = True
                        break

                if disponible_algun_dia:
                    salones_disponibles += 1

        # Determinar razón principal con detalle específico
        if salones_con_capacidad == 0:
            razones.append(f"Capacidad insuficiente: la clase tiene {clase.estudiantes} estudiantes y ningún salón disponible tiene esa capacidad (máximo disponible: {max((s['capacidad'] for s in salones_dict), default=0)})")
            conteo_razones["capacidad"] += 1
        elif salones_compatibles == 0:
            # Tiene capacidad pero no equipo
            if clase.requiere_videobeam:
                total_vb = len([s for s in salones_dict if s["tiene_videobeam"]])
                razones.append(f"Sin salones con videobeam: requiere VB pero solo hay {total_vb} salones equipados y ninguno tiene capacidad para {clase.estudiantes} est.")
                conteo_razones["videobeam"] += 1
            if clase.requiere_computadores:
                total_pc = len([s for s in salones_dict if s["tiene_computadores"]])
                razones.append(f"Sin salones con PC: requiere computadores pero solo hay {total_pc} salas de cómputo y ninguna tiene capacidad para {clase.estudiantes} est.")
                conteo_razones["computadores"] += 1
            if clase.requiere_laboratorio:
                total_lab = len([s for s in salones_dict if s["es_laboratorio"]])
                razones.append(f"Sin laboratorios: requiere lab pero solo hay {total_lab} laboratorios y ninguno tiene capacidad para {clase.estudiantes} est.")
                conteo_razones["laboratorio"] += 1
        elif salones_disponibles == 0:
            razones.append(f"Saturación horaria: los {salones_compatibles} salones compatibles están ocupados en los 5 días para el horario {clase.horario}")
            conteo_razones["todos_ocupados"] += 1

        # Verificar conflicto de profesor (mismo horario en muchas clases)
        from collections import Counter
        prof_count = sum(1 for a in asignaciones if a.profesor == clase.profesor and a.horario == clase.horario)
        if prof_count >= 5:
            razones.append(f"Conflicto de profesor: '{clase.profesor}' ya tiene {prof_count} clases asignadas en el horario {clase.horario} (5 días ocupados)")
            conteo_razones["horario_profesor"] += 1

        if not razones:
            razones.append(f"Conflicto complejo: había {salones_compatibles} salones compatibles y {salones_disponibles} con disponibilidad, pero el solver no encontró combinación válida de día + salón + profesor")
            conteo_razones["todos_ocupados"] += 1

        diagnosticos.append({
            "materia": clase.materia,
            "grupo": clase.grupo,
            "profesor": clase.profesor,
            "horario": clase.horario,
            "estudiantes": clase.estudiantes,
            "razones": razones,
            "salones_compatibles": salones_compatibles,
            "salones_disponibles": salones_disponibles,
        })

    # Detectar patrones automáticamente
    patrones = []
    total_no = len(clases_no_asignadas)

    if total_no > 0:
        if conteo_razones["capacidad"] > total_no * 0.3:
            patrones.append(f"El {round(conteo_razones['capacidad']/total_no*100)}% de las clases sin asignar necesitan salones más grandes de los disponibles.")
        if conteo_razones["videobeam"] > 0:
            patrones.append(f"{conteo_razones['videobeam']} clases requieren videobeam pero no hay suficientes salones equipados.")
        if conteo_razones["computadores"] > 0:
            patrones.append(f"{conteo_razones['computadores']} clases requieren computadores pero no hay suficientes salas de cómputo.")
        if conteo_razones["laboratorio"] > 0:
            patrones.append(f"{conteo_razones['laboratorio']} clases requieren laboratorio pero no hay suficientes disponibles.")
        if conteo_razones["todos_ocupados"] > total_no * 0.4:
            patrones.append("La mayoría de conflictos son por saturación de horarios. Los salones compatibles están llenos.")
        if conteo_razones["horario_profesor"] > 0:
            patrones.append(f"{conteo_razones['horario_profesor']} clases tienen profesores asignados fuera de su horario permitido.")

    # Recomendaciones
    recomendaciones = []
    if conteo_razones["capacidad"] > 0:
        recomendaciones.append("Considerar agregar salones con mayor capacidad al dataset.")
    if conteo_razones["todos_ocupados"] > 0:
        recomendaciones.append("Redistribuir horarios o agregar más salones para reducir la saturación.")
    if conteo_razones["videobeam"] + conteo_razones["computadores"] + conteo_razones["laboratorio"] > 0:
        recomendaciones.append("Equipar más salones con los recursos demandados (videobeam, computadores, laboratorio).")

    # ── Análisis detallado de salones libres ──────────────────────────────────
    salones_usados_set = set(a.salon_asignado for a in asignaciones)
    min_estudiantes = min((int(c.estudiantes) for c in clases_bd), default=0)

    salones_libres_detalle = []
    for salon in salones_bd:
        if salon.codigo in salones_usados_set:
            continue

        # Contar clases compatibles por capacidad
        clases_por_capacidad = sum(1 for c in clases_bd if int(c.estudiantes) <= salon.capacidad)

        # Contar clases compatibles por requisitos completos
        clases_compatibles = sum(
            1 for c in clases_bd
            if int(c.estudiantes) <= salon.capacidad
            and (not c.requiere_videobeam or salon.tiene_videobeam)
            and (not c.requiere_computadores or salon.tiene_computadores)
            and (not c.requiere_laboratorio or salon.es_laboratorio)
        )

        # Determinar razón principal
        if salon.capacidad < min_estudiantes:
            razon = "Capacidad insuficiente"
            detalle = f"Capacidad {salon.capacidad}, pero la clase más pequeña tiene {min_estudiantes} estudiantes"
        elif clases_por_capacidad == 0:
            razon = "Capacidad insuficiente"
            detalle = f"Capacidad {salon.capacidad}, ninguna clase cabe en este salón"
        elif str(salon.codigo).upper().startswith("IDI"):
            razon = "Excluido por política IDI"
            detalle = "Salón del bloque IDI penalizado por el solver (reservado para idiomas)"
        elif clases_compatibles == 0 and (salon.tiene_computadores or salon.es_laboratorio):
            razon = "Especializado no requerido"
            detalle = f"Tiene {'PC' if salon.tiene_computadores else ''} {'Lab' if salon.es_laboratorio else ''} pero ninguna clase compatible lo necesita"
        elif clases_compatibles == 0:
            razon = "Sin equipamiento requerido"
            detalle = "Las clases compatibles por tamaño requieren equipamiento que este salón no tiene"
        elif clases_compatibles > 0:
            razon = "No fue necesario"
            detalle = f"Compatible con {clases_compatibles} clases, pero el solver resolvió la demanda con otros salones"
        else:
            razon = "Baja demanda"
            detalle = "No hubo suficiente demanda para utilizar este salón"

        salones_libres_detalle.append({
            "codigo": salon.codigo,
            "bloque": salon.bloque or "—",
            "capacidad": salon.capacidad,
            "tiene_videobeam": salon.tiene_videobeam,
            "tiene_computadores": salon.tiene_computadores,
            "es_laboratorio": salon.es_laboratorio,
            "razon_principal": razon,
            "detalle": detalle,
            "clases_compatibles": clases_compatibles,
        })

    # Estadísticas de utilización por bloque
    total_salones = len(salones_bd)
    total_usados  = len(salones_usados_set)
    total_libres  = total_salones - total_usados
    pct_utilizacion = round(total_usados / max(total_salones, 1) * 100, 1)

    bloques_stats = {}
    for salon in salones_bd:
        bloque = salon.bloque or "Sin bloque"
        if bloque not in bloques_stats:
            bloques_stats[bloque] = {"usados": 0, "libres": 0, "total": 0}
        bloques_stats[bloque]["total"] += 1
        if salon.codigo in salones_usados_set:
            bloques_stats[bloque]["usados"] += 1
        else:
            bloques_stats[bloque]["libres"] += 1

    for bloque in bloques_stats:
        t = bloques_stats[bloque]["total"]
        u = bloques_stats[bloque]["usados"]
        bloques_stats[bloque]["porcentaje"] = round(u / max(t, 1) * 100, 1)

    # Conteo de razones de no uso
    razones_no_uso = {}
    for s in salones_libres_detalle:
        r = s["razon_principal"]
        razones_no_uso[r] = razones_no_uso.get(r, 0) + 1

    return {
        "total_no_asignadas": total_no,
        "diagnosticos": diagnosticos[:30],
        "conteo_razones": conteo_razones,
        "patrones": patrones,
        "recomendaciones": recomendaciones,
        "salones_libres": salones_libres_detalle,
        "total_salones_libres": total_libres,
        "utilizacion": {
            "porcentaje": pct_utilizacion,
            "salones_usados": total_usados,
            "salones_libres": total_libres,
            "total_salones": total_salones,
            "por_bloque": bloques_stats,
            "razones_no_uso": razones_no_uso,
        },
    }


# ── Edición manual de asignaciones ─────────────────────────────────────────

from pydantic import BaseModel

class ReasignarRequest(BaseModel):
    nuevo_salon_codigo: str
    nuevo_dia: str = None  # opcional, si no se envía mantiene el día actual


@router.get("/salones-disponibles/{asignacion_id}")
def salones_disponibles(asignacion_id: int, db: Session = Depends(get_db)):
    """
    Devuelve los salones compatibles y disponibles para reasignar una clase.
    Solo muestra salones que:
    - Tienen capacidad suficiente
    - Cumplen requisitos (PC, lab, VB)
    - Están libres en ese día y horario
    - No son IDI (excluidos)
    """
    asig = db.query(Asignacion).filter(Asignacion.id == asignacion_id).first()
    if not asig:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    salones_bd = db.query(Salon).filter(Salon.dataset_id == asig.dataset_id).all()
    todas_asig = db.query(Asignacion).filter(
        Asignacion.dataset_id == asig.dataset_id,
        Asignacion.id != asignacion_id,
    ).all()

    from src.utils.horarios import horarios_se_solapan

    disponibles = []
    for salon in salones_bd:
        # Excluir IDI
        if salon.codigo.upper().startswith("IDI"):
            continue

        # Capacidad
        if salon.capacidad < asig.estudiantes:
            continue

        # Requisitos
        if asig.requiere_vb and not salon.tiene_videobeam:
            continue
        if asig.requiere_pc and not salon.tiene_computadores:
            continue
        if asig.requiere_lab and not salon.es_laboratorio:
            continue

        # Verificar disponibilidad en el día actual
        ocupado = False
        for otra in todas_asig:
            if (otra.salon_asignado == salon.codigo
                and otra.dia_asignado == asig.dia_asignado
                and horarios_se_solapan(asig.horario, otra.horario)):
                ocupado = True
                break

        if ocupado:
            continue

        # Calcular ajuste
        desperdicio = salon.capacidad - asig.estudiantes
        if desperdicio <= 5:
            ajuste = "excelente"
        elif desperdicio <= 15:
            ajuste = "bueno"
        else:
            ajuste = "aceptable"

        disponibles.append({
            "codigo": salon.codigo,
            "bloque": salon.bloque,
            "capacidad": salon.capacidad,
            "tiene_videobeam": salon.tiene_videobeam,
            "tiene_computadores": salon.tiene_computadores,
            "es_laboratorio": salon.es_laboratorio,
            "desperdicio": desperdicio,
            "ajuste": ajuste,
        })

    # Ordenar por menor desperdicio
    disponibles.sort(key=lambda s: s["desperdicio"])

    return {
        "asignacion_id": asignacion_id,
        "clase": f"{asig.materia} - {asig.grupo}",
        "dia": asig.dia_asignado,
        "horario": asig.horario,
        "salon_actual": asig.salon_asignado,
        "disponibles": disponibles,
    }


@router.put("/reasignar/{asignacion_id}")
def reasignar_clase(asignacion_id: int, datos: ReasignarRequest, db: Session = Depends(get_db)):
    """
    Reasigna una clase a un nuevo salón.
    Valida que el salón esté disponible antes de guardar.
    """
    asig = db.query(Asignacion).filter(Asignacion.id == asignacion_id).first()
    if not asig:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")

    # Verificar que el salón existe
    salon = db.query(Salon).filter(
        Salon.dataset_id == asig.dataset_id,
        Salon.codigo == datos.nuevo_salon_codigo,
    ).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado en el dataset")

    # Validar capacidad
    if salon.capacidad < asig.estudiantes:
        raise HTTPException(status_code=400, detail=f"Capacidad insuficiente: el salón tiene {salon.capacidad} pero la clase necesita {asig.estudiantes}")

    # Validar requisitos
    if asig.requiere_vb and not salon.tiene_videobeam:
        raise HTTPException(status_code=400, detail="El salón no tiene videobeam")
    if asig.requiere_pc and not salon.tiene_computadores:
        raise HTTPException(status_code=400, detail="El salón no tiene computadores")
    if asig.requiere_lab and not salon.es_laboratorio:
        raise HTTPException(status_code=400, detail="El salón no es laboratorio")

    # Validar disponibilidad (no conflicto con otra clase)
    from src.utils.horarios import horarios_se_solapan

    dia_final = datos.nuevo_dia or asig.dia_asignado
    conflicto = db.query(Asignacion).filter(
        Asignacion.dataset_id == asig.dataset_id,
        Asignacion.id != asignacion_id,
        Asignacion.salon_asignado == datos.nuevo_salon_codigo,
        Asignacion.dia_asignado == dia_final,
    ).all()

    for otra in conflicto:
        if horarios_se_solapan(asig.horario, otra.horario):
            raise HTTPException(
                status_code=409,
                detail=f"Conflicto: el salón {datos.nuevo_salon_codigo} ya tiene '{otra.materia}' el {dia_final} en horario {otra.horario}"
            )

    # Guardar cambio
    salon_anterior = asig.salon_asignado
    asig.salon_asignado  = datos.nuevo_salon_codigo
    asig.bloque_salon    = salon.bloque or ""
    asig.capacidad_salon = salon.capacidad
    asig.desperdicio     = salon.capacidad - asig.estudiantes
    if datos.nuevo_dia:
        asig.dia_asignado = datos.nuevo_dia

    db.commit()
    db.refresh(asig)

    return {
        "mensaje": f"Clase reasignada de {salon_anterior} a {datos.nuevo_salon_codigo}",
        "asignacion": {
            "id": asig.id,
            "materia": asig.materia,
            "grupo": asig.grupo,
            "salon_asignado": asig.salon_asignado,
            "dia_asignado": asig.dia_asignado,
            "desperdicio": asig.desperdicio,
        },
    }
