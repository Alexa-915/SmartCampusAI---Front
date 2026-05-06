# =============================================================================
#  SmartCampusAI — src/csp/restricciones.py
#  Validación de restricciones del CSP
# =============================================================================

from src.utils.horarios import parsear_horario, horario_dentro_de_jornada


def profesor_disponible(clase: dict) -> bool:
    """
    Valida si el horario de la clase cae en la franja permitida
    según el tipo de profesor.

    Planta:      7:00–12:00  y  14:00–18:30
    Catedrático: 6:00–9:00   |  12:00–14:00  |  18:00–21:00
    """
    inicio, _ = parsear_horario(clase["horario"])
    tipo = clase["tipo"].strip().lower()

    if "planta" in tipo:
        return (7 <= inicio < 12) or (14 <= inicio <= 18.5)

    if "catedr" in tipo:
        return (6 <= inicio <= 9) or (12 <= inicio < 14) or (18 <= inicio <= 21)

    print(f"⚠️  Tipo de profesor desconocido: '{clase['tipo']}' en '{clase['materia']}'")
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
