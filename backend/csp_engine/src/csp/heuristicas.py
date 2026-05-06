# =============================================================================
#  SmartCampusAI — src/csp/heuristicas.py
#  Heurística MRV (Minimum Remaining Values) para ordenar las variables del CSP
# =============================================================================

from src.csp.restricciones import es_valida_asignacion

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


def calcular_valores_restantes(clase: dict, salones: list[dict]) -> int:
    """
    MRV — Minimum Remaining Values.

    Cuenta cuántas combinaciones (salón × día) son estáticamente válidas
    para esta clase. Cuanto menor el número, más restrictiva es la clase
    y más prioritaria debe ser en el orden de asignación.

    No considera el estado actual del solver (ocupación dinámica),
    solo las restricciones fijas (capacidad, equipos, tipo de profesor).
    """
    salones_validos = sum(1 for s in salones if es_valida_asignacion(clase, s))
    return salones_validos * len(DIAS_SEMANA)


def ordenar_clases_por_mrv(clases: list[dict], salones: list[dict]) -> list[dict]:
    """
    Ordena las clases de MÁS restrictiva a MENOS restrictiva usando MRV.

    Criterio principal:   MRV ascendente       (menos opciones → va primero)
    Criterio secundario:  más estudiantes       (mayor grupo → va primero)
    Criterio terciario:   requiere laboratorio  (más específica → va primero)

    Esto garantiza que las clases difíciles de ubicar (laboratorios,
    grupos grandes, restricciones de equipo) se resuelvan antes de que
    los salones especiales sean ocupados por clases más flexibles.
    """
    def prioridad(clase: dict) -> tuple:
        mrv     = calcular_valores_restantes(clase, salones)
        alumnos = int(clase["estudiantes"])
        es_lab  = 1 if clase["requiere_laboratorio"] else 0
        return (mrv, -alumnos, -es_lab)

    return sorted(clases, key=prioridad)
