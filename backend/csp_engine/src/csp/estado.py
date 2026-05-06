# =============================================================================
#  SmartCampusAI — src/csp/estado.py
#  Estado del solver: registro de ocupación de salones y profesores
# =============================================================================

from src.utils.horarios import horarios_se_solapan

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


class EstadoSolver:
    """
    Mantiene el registro dinámico de qué salones y profesores están
    ocupados en cada combinación (día, horario).

    Permite consultar disponibilidad y deshacer asignaciones,
    lo cual es esencial para el backtracking.

    Estructura interna:
        ocupacion_salones:    { (salon_id, dia) → [horario, ...] }
        ocupacion_profesores: { (profesor, dia) → [horario, ...] }

    El uso de día como parte de la clave permite que el mismo salón
    se use a las 7:00 el Lunes Y a las 7:00 el Martes sin conflicto.
    """

    def __init__(self, salones: list[dict]):
        # Inicializar todas las combinaciones (salón, día) como vacías
        self.ocupacion_salones: dict[tuple, list[str]] = {
            (s["id"], dia): []
            for s in salones
            for dia in DIAS_SEMANA
        }
        # Los profesores se registran bajo demanda
        self.ocupacion_profesores: dict[tuple, list[str]] = {}

    def salon_disponible(self, salon_id: str, dia: str, horario: str) -> bool:
        """True si el salón no tiene ninguna clase solapada ese día y horario."""
        return not any(
            horarios_se_solapan(horario, h)
            for h in self.ocupacion_salones[(salon_id, dia)]
        )

    def profesor_libre(self, profesor: str, dia: str, horario: str) -> bool:
        """True si el profesor no tiene ninguna clase solapada ese día y horario."""
        clave = (profesor, dia)
        if clave not in self.ocupacion_profesores:
            return True
        return not any(
            horarios_se_solapan(horario, h)
            for h in self.ocupacion_profesores[clave]
        )

    def asignar(self, salon_id: str, profesor: str, dia: str, horario: str):
        """Registra una asignación en el estado del solver."""
        self.ocupacion_salones[(salon_id, dia)].append(horario)
        clave = (profesor, dia)
        if clave not in self.ocupacion_profesores:
            self.ocupacion_profesores[clave] = []
        self.ocupacion_profesores[clave].append(horario)

    def desasignar(self, salon_id: str, profesor: str, dia: str, horario: str):
        """
        Deshace una asignación previa.
        Usado por el backtracking para liberar un (salón, día, horario).
        """
        self.ocupacion_salones[(salon_id, dia)].remove(horario)
        self.ocupacion_profesores[(profesor, dia)].remove(horario)
