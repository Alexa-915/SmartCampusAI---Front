# =============================================================================
#  SmartCampusAI — src/csp/heuristicas.py
#  Heurística MRV mejorada con priorización inteligente
# =============================================================================

from src.csp.restricciones import es_valida_asignacion
from collections import Counter

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


def calcular_valores_restantes(clase: dict, salones: list[dict]) -> int:
    """
    MRV — Minimum Remaining Values.
    Cuenta cuántas combinaciones (salón × día) son válidas para esta clase.
    """
    salones_validos = sum(1 for s in salones if es_valida_asignacion(clase, s))
    return salones_validos * len(DIAS_SEMANA)


def ordenar_clases_por_mrv(clases: list[dict], salones: list[dict]) -> list[dict]:
    """
    Ordena las clases de MÁS difícil a MENOS difícil.

    Prioridad (de mayor a menor importancia):
    1. Clases que requieren computadores (recurso más escaso)
    2. Clases que requieren laboratorio
    3. Clases con más requisitos combinados
    4. Clases con menos salones compatibles (MRV real)
    5. Clases con más estudiantes (más difíciles de ubicar)
    6. Horarios más congestionados

    Esto garantiza que las clases difíciles se resuelvan primero,
    antes de que los recursos especiales sean consumidos por clases flexibles.
    """
    # Calcular congestión por horario (cuántas clases comparten el mismo horario)
    horario_count = Counter(c["horario"] for c in clases)

    def prioridad(clase: dict) -> tuple:
        mrv = calcular_valores_restantes(clase, salones)
        alumnos = int(clase["estudiantes"])

        # Requisitos especiales (más requisitos = más difícil)
        req_pc  = 1 if clase.get("requiere_computadores") else 0
        req_lab = 1 if clase.get("requiere_laboratorio") else 0
        req_vb  = 1 if clase.get("requiere_videobeam") else 0
        total_req = req_pc + req_lab + req_vb

        # Congestión del horario
        congestion = horario_count.get(clase["horario"], 0)

        return (
            -req_pc,        # PC primero (recurso más escaso)
            -req_lab,       # Lab segundo
            -total_req,     # Más requisitos = más prioritario
            mrv,            # Menos opciones = más prioritario
            -alumnos,       # Más estudiantes = más prioritario
            -congestion,    # Horarios congestionados primero
        )

    return sorted(clases, key=prioridad)
