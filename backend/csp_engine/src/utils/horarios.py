# =============================================================================
#  SmartCampusAI — src/utils/horarios.py
#  Funciones auxiliares para manejo y comparación de horarios
# =============================================================================


def parsear_horario(horario_str: str) -> tuple[float, float]:
    """
    Convierte un string de horario en una tupla de horas decimales.

    Ejemplos:
        "7:00–10:00"  →  (7.0, 10.0)
        "18:00–21:00" →  (18.0, 21.0)

    Soporta em dash (–) y guión normal (-).
    """
    horario_str = horario_str.strip()
    sep = "–" if "–" in horario_str else "-"
    partes = horario_str.split(sep)

    def a_decimal(t: str) -> float:
        h, m = map(int, t.strip().split(":"))
        return h + m / 60

    return a_decimal(partes[0]), a_decimal(partes[1])


def horarios_se_solapan(h1: str, h2: str) -> bool:
    """
    Devuelve True si dos franjas horarias se solapan.

    Dos clases que terminan y comienzan exactamente en el mismo punto
    NO se consideran solapadas.

    Ejemplos:
        "7:00–9:00"  vs "8:00–10:00" → True  (solapan)
        "7:00–9:00"  vs "9:00–11:00" → False (no solapan)
    """
    i1, f1 = parsear_horario(h1)
    i2, f2 = parsear_horario(h2)
    return i1 < f2 and i2 < f1


def horario_dentro_de_jornada(horario: str) -> bool:
    """
    Verifica que el horario esté dentro de la jornada universitaria.
    Rango permitido: 6:00 – 21:00
    """
    inicio, fin = parsear_horario(horario)
    return 6.0 <= inicio and fin <= 21.0
