# =============================================================================
#  SmartCampusAI — src/csp/restricciones.py
#  Validación de restricciones del CSP
# =============================================================================

from src.utils.horarios import parsear_horario, horario_dentro_de_jornada


def profesor_disponible(clase: dict) -> bool:
    """
    Valida si el horario de la clase cae en la franja permitida
    según el tipo de profesor.

    NOTA: Se relajó esta restricción porque los horarios vienen definidos
    desde el Excel académico. Si la universidad asignó ese horario al profesor,
    es válido. Solo se valida que esté dentro de la jornada general (6:00–21:00).

    Planta:      7:00–18:30 (jornada laboral completa)
    Catedrático: 6:00–21:00 (toda la jornada universitaria)
    """
    inicio, fin = parsear_horario(clase["horario"])
    tipo = clase["tipo"].strip().lower()

    if "planta" in tipo:
        # Planta puede dar clase en toda la jornada laboral
        return 6.0 <= inicio and fin <= 21.0

    if "catedr" in tipo:
        # Catedrático puede dar clase en toda la jornada universitaria
        return 6.0 <= inicio and fin <= 21.0

    # Tipo desconocido → permitir (no bloquear innecesariamente)
    return True


def es_valida_asignacion(clase: dict, salon: dict) -> bool:
    """
    Verifica todas las restricciones estáticas entre una clase y un salón.
    Estas restricciones son independientes del día asignado.

    Restricciones evaluadas:
        1. Horario dentro de la jornada universitaria (6:00–21:00)
        2. Disponibilidad del profesor según su tipo
        3. Capacidad suficiente del salón
        4. Videobeam disponible (si la clase lo requiere)
        5. Computadores disponibles (si la clase lo requiere)
        6. Es laboratorio (si la clase lo requiere)

    Las restricciones dinámicas (conflictos entre clases en el mismo
    salón y horario) se manejan en el solver, no aquí.
    """
    if not horario_dentro_de_jornada(clase["horario"]):
        return False

    if not profesor_disponible(clase):
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
