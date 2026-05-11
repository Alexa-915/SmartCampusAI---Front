# =============================================================================
#  SmartCampusAI — src/csp/restricciones.py
#  Validación de restricciones del CSP + prefiltrado + scoring
# =============================================================================

from src.utils.horarios import parsear_horario, horario_dentro_de_jornada
from collections import Counter


def profesor_disponible(clase: dict) -> bool:
    """
    Valida si el horario está dentro de la jornada universitaria.
    Los horarios vienen del Excel académico, así que son válidos por definición.
    """
    return horario_dentro_de_jornada(clase["horario"])


def es_valida_asignacion(clase: dict, salon: dict) -> bool:
    """
    Restricciones DURAS (hard constraints).
    Si alguna falla, la asignación es imposible.
    """
    if not horario_dentro_de_jornada(clase["horario"]):
        return False

    if salon["capacidad"] < clase["estudiantes"]:
        return False

    if clase["requiere_videobeam"] and not salon["tiene_videobeam"]:
        return False

    if clase["requiere_computadores"] and not salon["tiene_computadores"]:
        return False

    if clase["requiere_laboratorio"] and not salon["es_laboratorio"]:
        return False

    return True


def score_salon(salon: dict, clase: dict, carga_por_bloque: dict) -> tuple:
    """
    Restricciones BLANDAS (soft constraints) — scoring inteligente.
    Menor score = mejor opción.

    Penaliza:
    - Usar salones IDI para clases que no son de idiomas
    - Usar salones con PC para clases que no requieren PC
    - Usar laboratorios para clases que no requieren lab
    - Desperdiciar mucha capacidad
    - Sobrecargar un bloque
    """
    penalizacion = 0
    desperdicio  = salon["capacidad"] - int(clase["estudiantes"])

    # Penalizar salones IDI (reservados para idiomas, usar como último recurso)
    salon_id = str(salon.get("id", ""))
    if salon_id.upper().startswith("IDI"):
        penalizacion += 1000

    # Penalizar usar salones con PC para clases que no los necesitan
    if salon.get("tiene_computadores") and not clase.get("requiere_computadores"):
        penalizacion += 500

    # Penalizar usar laboratorios para clases que no los necesitan
    if salon.get("es_laboratorio") and not clase.get("requiere_laboratorio"):
        penalizacion += 300

    # Penalizar usar salones con videobeam para clases que no lo necesitan
    if salon.get("tiene_videobeam") and not clase.get("requiere_videobeam"):
        penalizacion += 50

    # Penalizar sobrecargar un bloque
    carga_bloque = carga_por_bloque.get(salon.get("bloque", ""), 0)

    return (penalizacion, desperdicio, carga_bloque, salon_id)


def prefiltrar_clases(clases: list[dict], salones: list[dict]) -> dict:
    """
    FASE 0 — Prefiltrado inteligente.
    Clasifica las clases ANTES de que entren al solver.

    Retorna:
    {
        "asignables":  [...],   # entran al solver normalmente
        "advertencias": [...],  # entran al solver pero marcadas
        "imposibles":  [...],   # NO entran al solver
    }
    """
    # Calcular capacidades máximas por tipo
    cap_maxima_general = max((s["capacidad"] for s in salones), default=0)
    salones_pc  = [s for s in salones if s.get("tiene_computadores")]
    salones_lab = [s for s in salones if s.get("es_laboratorio")]
    cap_maxima_pc  = max((s["capacidad"] for s in salones_pc), default=0)
    cap_maxima_lab = max((s["capacidad"] for s in salones_lab), default=0)

    # Contar competencia por horario
    horario_pc_count  = Counter()  # horario → cuántas clases requieren PC
    horario_lab_count = Counter()
    for c in clases:
        if c.get("requiere_computadores"):
            horario_pc_count[c["horario"]] += 1
        if c.get("requiere_laboratorio"):
            horario_lab_count[c["horario"]] += 1

    # Contar profesor por horario
    prof_horario_count = Counter()
    for c in clases:
        prof_horario_count[(c["profesor"], c["horario"])] += 1

    imposibles   = []
    advertencias = []
    asignables   = []

    for clase in clases:
        est = int(clase["estudiantes"])
        razon = None
        es_advertencia = False

        # ── IMPOSIBLES ──
        if est > cap_maxima_general:
            razon = f"Imposible: {est} estudiantes superan la capacidad máxima disponible ({cap_maxima_general})"
        elif clase.get("requiere_computadores") and est > cap_maxima_pc:
            razon = f"Imposible: requiere PC para {est} estudiantes pero el salón PC más grande tiene capacidad {cap_maxima_pc}"
        elif clase.get("requiere_laboratorio") and est > cap_maxima_lab:
            razon = f"Imposible: requiere laboratorio para {est} estudiantes pero el lab más grande tiene capacidad {cap_maxima_lab}"

        if razon:
            imposibles.append({**clase, "razon_no_asignacion": razon})
            continue

        # ── ADVERTENCIAS ──
        razones_adv = []

        # Competencia por PC en ese horario
        if clase.get("requiere_computadores"):
            competencia = horario_pc_count[clase["horario"]]
            # Cada salón PC puede usarse 5 veces (5 días)
            slots_pc = len(salones_pc) * 5
            if competencia > slots_pc:
                razones_adv.append(
                    f"Alta competencia: {competencia} clases compiten por {len(salones_pc)} salones PC "
                    f"({slots_pc} slots) en horario {clase['horario']}"
                )

        # Competencia por laboratorio
        if clase.get("requiere_laboratorio"):
            competencia = horario_lab_count[clase["horario"]]
            slots_lab = len(salones_lab) * 5
            if competencia > slots_lab:
                razones_adv.append(
                    f"Alta competencia: {competencia} clases compiten por {len(salones_lab)} laboratorios "
                    f"({slots_lab} slots) en horario {clase['horario']}"
                )

        # Profesor saturado
        prof_count = prof_horario_count[(clase["profesor"], clase["horario"])]
        if prof_count > 5:
            razones_adv.append(
                f"Profesor '{clase['profesor']}' tiene {prof_count} clases en horario {clase['horario']} (máx 5 días)"
            )

        if razones_adv:
            advertencias.append({
                **clase,
                "advertencia": True,
                "razon_no_asignacion": " | ".join(razones_adv),
            })
        else:
            asignables.append(clase)

    print(f"📋 Prefiltrado: {len(asignables)} asignables, {len(advertencias)} con advertencia, {len(imposibles)} imposibles")
    return {
        "asignables": asignables,
        "advertencias": advertencias,
        "imposibles": imposibles,
    }
