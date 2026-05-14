"""
SmartCampus AI Agent — Motor de Análisis de Viabilidad Académica

Analiza datasets de clases y salones ANTES del scheduling.
NO analiza horarios calendarizados (eso lo hace el solver).

Detecta:
- Sobrecarga de franjas horarias
- Carga académica imposible por profesor
- Insuficiencia de tipologías (labs, PCs)
- Capacidad insuficiente
- Restricciones incompatibles
- Datos inconsistentes
"""

from collections import Counter
from app.models.clase import Clase
from app.models.salon import Salon
from sqlalchemy.orm import Session


def analizar_dataset(dataset_id: int, db: Session) -> dict:
    """
    Analiza la viabilidad académica de un dataset PREVIO al solver.
    Retorna métricas, conflictos potenciales y score de calidad.

    IMPORTANTE: El dataset NO tiene días asignados. Solo tiene franjas horarias
    que representan la DEMANDA semanal. El solver asignará los días después.
    """
    clases  = db.query(Clase).filter(Clase.dataset_id == dataset_id).all()
    salones = db.query(Salon).filter(Salon.dataset_id == dataset_id).all()

    if not clases and not salones:
        return {"error": "Dataset vacío: no hay clases ni salones cargados", "clases": 0, "salones": 0}
    if not clases:
        return {"error": "No hay clases cargadas en este dataset", "clases": 0, "salones": len(salones)}
    if not salones:
        return {"error": "No hay salones cargados en este dataset", "clases": len(clases), "salones": 0}

    # ══════════════════════════════════════════════════════════════════════════
    # INVENTARIO BÁSICO
    # ══════════════════════════════════════════════════════════════════════════
    total_clases  = len(clases)
    total_salones = len(salones)

    salones_lab = [s for s in salones if getattr(s, 'es_laboratorio', False)]
    salones_pc  = [s for s in salones if getattr(s, 'tiene_computadores', False)]
    salones_vb  = [s for s in salones if getattr(s, 'tiene_videobeam', False)]

    clases_lab = [c for c in clases if getattr(c, 'requiere_laboratorio', False)]
    clases_pc  = [c for c in clases if getattr(c, 'requiere_computadores', False)]
    clases_vb  = [c for c in clases if getattr(c, 'requiere_videobeam', False)]

    cap_maxima = max((getattr(s, 'capacidad', 0) or 0 for s in salones), default=0)

    # ══════════════════════════════════════════════════════════════════════════
    # 1. CARGA ACADÉMICA IMPOSIBLE POR PROFESOR
    # Un profesor con N clases en la misma franja necesita N días distintos.
    # Si N > 5 (lunes a viernes), es matemáticamente imposible.
    # ══════════════════════════════════════════════════════════════════════════
    prof_franja = Counter(
        (getattr(c, 'profesor', '') or '', getattr(c, 'horario', '') or '')
        for c in clases
        if getattr(c, 'profesor', '') and getattr(c, 'horario', '')
    )
    carga_imposible = [
        {
            "profesor": prof,
            "franja": franja,
            "sesiones_requeridas": count,
            "maximo_posible": 5,
            "explicacion": f"'{prof}' requiere {count} sesiones en la franja {franja}, pero solo existen 5 días hábiles."
        }
        for (prof, franja), count in prof_franja.items()
        if count > 5
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # 2. SOBRECARGA DE FRANJAS (SATURACIÓN POTENCIAL)
    # Si muchas clases compiten por la misma franja, el solver tendrá
    # dificultades para distribuirlas en solo 5 días × N salones.
    # ══════════════════════════════════════════════════════════════════════════
    franjas = Counter(getattr(c, 'horario', '') or '' for c in clases if getattr(c, 'horario', ''))
    franja_top = franjas.most_common(5)

    # Capacidad teórica por franja = total_salones × 5 días
    capacidad_franja = total_salones * 5
    franjas_saturadas = [
        {
            "franja": franja,
            "demanda": count,
            "capacidad_teorica": capacidad_franja,
            "porcentaje_uso": round(count / capacidad_franja * 100, 1) if capacidad_franja > 0 else 0,
            "explicacion": f"La franja {franja} tiene {count} clases compitiendo por {total_salones} salones × 5 días ({capacidad_franja} slots)."
        }
        for franja, count in franja_top
        if count > total_salones * 3  # más del 60% de capacidad teórica
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # 3. INSUFICIENCIA DE TIPOLOGÍAS
    # Más clases requieren un recurso que salones lo ofrecen × 5 días.
    # ══════════════════════════════════════════════════════════════════════════
    insuficiencias = []

    if clases_lab:
        slots_lab = len(salones_lab) * 5
        if len(clases_lab) > slots_lab:
            insuficiencias.append({
                "recurso": "Laboratorio",
                "demanda": len(clases_lab),
                "oferta_semanal": slots_lab,
                "salones_disponibles": len(salones_lab),
                "explicacion": f"{len(clases_lab)} clases requieren laboratorio pero solo hay {len(salones_lab)} labs ({slots_lab} slots semanales)."
            })

    if clases_pc:
        slots_pc = len(salones_pc) * 5
        if len(clases_pc) > slots_pc:
            insuficiencias.append({
                "recurso": "Computadores",
                "demanda": len(clases_pc),
                "oferta_semanal": slots_pc,
                "salones_disponibles": len(salones_pc),
                "explicacion": f"{len(clases_pc)} clases requieren PC pero solo hay {len(salones_pc)} salas ({slots_pc} slots semanales)."
            })

    if clases_vb:
        slots_vb = len(salones_vb) * 5
        if len(clases_vb) > slots_vb:
            insuficiencias.append({
                "recurso": "Videobeam",
                "demanda": len(clases_vb),
                "oferta_semanal": slots_vb,
                "salones_disponibles": len(salones_vb),
                "explicacion": f"{len(clases_vb)} clases requieren videobeam pero solo hay {len(salones_vb)} salones equipados."
            })

    # ══════════════════════════════════════════════════════════════════════════
    # 4. CAPACIDAD INSUFICIENTE (CLASES SIN SALÓN POSIBLE)
    # Clases con más estudiantes que el salón más grande disponible.
    # ══════════════════════════════════════════════════════════════════════════
    clases_sin_salon = []
    for c in clases:
        est = getattr(c, 'estudiantes', 0) or 0
        req_lab = getattr(c, 'requiere_laboratorio', False)
        req_pc  = getattr(c, 'requiere_computadores', False)

        if est > cap_maxima:
            clases_sin_salon.append({
                "materia": c.materia, "grupo": c.grupo,
                "estudiantes": est,
                "razon": f"Necesita {est} cupos pero el salón más grande tiene {cap_maxima}."
            })
        elif req_lab:
            cap_lab_max = max((getattr(s, 'capacidad', 0) or 0 for s in salones_lab), default=0)
            if est > cap_lab_max:
                clases_sin_salon.append({
                    "materia": c.materia, "grupo": c.grupo,
                    "estudiantes": est,
                    "razon": f"Requiere laboratorio para {est} est. pero el lab más grande tiene {cap_lab_max}."
                })
        elif req_pc:
            cap_pc_max = max((getattr(s, 'capacidad', 0) or 0 for s in salones_pc), default=0)
            if est > cap_pc_max:
                clases_sin_salon.append({
                    "materia": c.materia, "grupo": c.grupo,
                    "estudiantes": est,
                    "razon": f"Requiere sala PC para {est} est. pero la sala PC más grande tiene {cap_pc_max}."
                })

    # ══════════════════════════════════════════════════════════════════════════
    # 5. DATOS INCONSISTENTES
    # Campos vacíos, duplicados, valores inválidos.
    # ══════════════════════════════════════════════════════════════════════════
    inconsistencias = []

    # Clases sin profesor
    sin_profesor = [c for c in clases if not (getattr(c, 'profesor', '') or '').strip()]
    if sin_profesor:
        inconsistencias.append({
            "tipo": "campo_vacio",
            "campo": "profesor",
            "cantidad": len(sin_profesor),
            "explicacion": f"{len(sin_profesor)} clases no tienen profesor asignado."
        })

    # Clases sin horario
    sin_horario = [c for c in clases if not (getattr(c, 'horario', '') or '').strip()]
    if sin_horario:
        inconsistencias.append({
            "tipo": "campo_vacio",
            "campo": "horario",
            "cantidad": len(sin_horario),
            "explicacion": f"{len(sin_horario)} clases no tienen franja horaria definida."
        })

    # Clases con 0 estudiantes
    sin_estudiantes = [c for c in clases if (getattr(c, 'estudiantes', 0) or 0) <= 0]
    if sin_estudiantes:
        inconsistencias.append({
            "tipo": "valor_invalido",
            "campo": "estudiantes",
            "cantidad": len(sin_estudiantes),
            "explicacion": f"{len(sin_estudiantes)} clases tienen 0 o menos estudiantes."
        })

    # ══════════════════════════════════════════════════════════════════════════
    # 5b. HORARIOS FUERA DEL RANGO INSTITUCIONAL
    # Rango permitido: 6:00 AM – 21:00 (9:00 PM)
    # Clases fuera de este rango son incompatibles con el solver.
    # ══════════════════════════════════════════════════════════════════════════
    horarios_invalidos = []

    for c in clases:
        horario = (getattr(c, 'horario', '') or '').strip()
        if not horario:
            continue

        # Parsear la franja horaria
        sep = '–' if '–' in horario else '-'
        partes = horario.split(sep)
        if len(partes) != 2:
            continue

        try:
            inicio_str = partes[0].strip()
            fin_str    = partes[1].strip()

            # Extraer hora decimal (soporta "7:00", "18:30", "9 PM", etc.)
            inicio_h = _parsear_hora_flexible(inicio_str)
            fin_h    = _parsear_hora_flexible(fin_str)

            if inicio_h is None or fin_h is None:
                continue

            # Validar rango: 6:00 (6.0) a 21:00 (21.0)
            if inicio_h < 6.0 or fin_h > 21.0:
                horarios_invalidos.append({
                    "materia": c.materia,
                    "grupo": c.grupo,
                    "horario": horario,
                    "problema": "antes de 6:00 AM" if inicio_h < 6.0 else "después de 9:00 PM",
                    "explicacion": f"'{c.materia} ({c.grupo})' tiene horario {horario} que está fuera del rango institucional (6:00 AM – 9:00 PM)."
                })
        except (ValueError, IndexError):
            continue

    # ══════════════════════════════════════════════════════════════════════════
    # 6. SCORE DE VIABILIDAD (0–100)
    # Mide qué tan preparado está el dataset para el solver.
    # ══════════════════════════════════════════════════════════════════════════
    penalizacion = 0

    # Clases imposibles (sin salón posible): -10 cada una, máx -30
    penalizacion += min(len(clases_sin_salon) * 10, 30)

    # Carga imposible de profesor: -8 cada una, máx -24
    penalizacion += min(len(carga_imposible) * 8, 24)

    # Insuficiencia de recursos: -12 cada una, máx -24
    penalizacion += min(len(insuficiencias) * 12, 24)

    # Franjas saturadas: -6 cada una, máx -12
    penalizacion += min(len(franjas_saturadas) * 6, 12)

    # Datos inconsistentes: -3 por tipo, máx -9
    penalizacion += min(len(inconsistencias) * 3, 9)

    # Horarios fuera de rango: -5 cada uno, máx -20
    penalizacion += min(len(horarios_invalidos) * 5, 20)

    score = max(0, 100 - penalizacion)

    if score >= 80:
        nivel = "alto"
        mensaje_nivel = "El dataset está bien preparado para el solver."
    elif score >= 60:
        nivel = "medio"
        mensaje_nivel = "El dataset tiene advertencias que podrían afectar la calidad de la asignación."
    else:
        nivel = "bajo"
        mensaje_nivel = "El dataset tiene problemas importantes que deben corregirse antes de ejecutar el solver."

    # ══════════════════════════════════════════════════════════════════════════
    # 7. DISTRIBUCIÓN POR BLOQUES
    # ══════════════════════════════════════════════════════════════════════════
    bloques = Counter(getattr(s, 'bloque', '') or 'Sin bloque' for s in salones)

    # ══════════════════════════════════════════════════════════════════════════
    # RESULTADO FINAL
    # ══════════════════════════════════════════════════════════════════════════
    return {
        "total_clases":       total_clases,
        "total_salones":      total_salones,
        "score":              score,
        "nivel_viabilidad":   nivel,
        "mensaje_nivel":      mensaje_nivel,
        # Conflictos detectados
        "carga_imposible":        carga_imposible,
        "clases_sin_salon":       clases_sin_salon,
        "franjas_saturadas":      franjas_saturadas,
        "insuficiencia_recursos": insuficiencias,
        "datos_inconsistentes":   inconsistencias,
        "horarios_invalidos":     horarios_invalidos,
        # Métricas de recursos
        "recursos": {
            "salones_lab":   len(salones_lab),
            "clases_lab":    len(clases_lab),
            "salones_pc":    len(salones_pc),
            "clases_pc":     len(clases_pc),
            "salones_vb":    len(salones_vb),
            "clases_vb":     len(clases_vb),
            "cap_maxima":    cap_maxima,
        },
        "franjas_mas_demandadas": [{"franja": f, "clases": n} for f, n in franja_top],
        "bloques": dict(bloques.most_common()),
    }


def _parsear_hora_flexible(texto: str) -> float | None:
    """
    Parsea una hora en múltiples formatos y retorna hora decimal.
    Soporta: "7:00", "18:30", "9 PM", "6", "21:00", "9:00 PM"
    Retorna None si no puede parsear.
    """
    texto = texto.strip().upper()

    # Detectar AM/PM
    es_pm = 'PM' in texto
    es_am = 'AM' in texto
    texto = texto.replace('PM', '').replace('AM', '').replace('P.M.', '').replace('A.M.', '').strip()

    try:
        if ':' in texto:
            partes = texto.split(':')
            h = int(partes[0])
            m = int(partes[1]) if len(partes) > 1 else 0
        else:
            h = int(texto)
            m = 0

        # Convertir 12h a 24h
        if es_pm and h < 12:
            h += 12
        elif es_am and h == 12:
            h = 0

        return h + m / 60.0
    except (ValueError, IndexError):
        return None
