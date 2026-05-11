# =============================================================================
#  SmartCampusAI — src/csp/solver.py
#  Solver CSP con heurística MRV + Soft Constraints + Backtracking dirigido
# =============================================================================

from src.csp.restricciones import es_valida_asignacion, score_salon, prefiltrar_clases
from src.csp.heuristicas   import ordenar_clases_por_mrv
from src.csp.estado        import EstadoSolver
from src.utils.horarios    import horarios_se_solapan

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


def resolver_csp(clases: list[dict], salones: list[dict]) -> dict:
    """
    Solver CSP en tres fases:

    FASE 0 — Prefiltrado:
        Clasifica clases en imposibles, advertencias y asignables.
        Las imposibles no entran al solver.

    FASE 1 — Greedy con MRV + Score inteligente:
        1. Ordena clases por dificultad (MRV mejorado).
        2. Para cada clase, evalúa TODOS los salones válidos.
        3. Usa score_salon() para elegir el mejor (no el primero).
        4. Balancea carga entre días y bloques.

    FASE 2 — Backtracking dirigido:
        Intenta reubicar clases ya asignadas para liberar espacio.
    """

    # ── FASE 0: Prefiltrado ───────────────────────────────────────────────────
    print("\n📋 FASE 0 — Prefiltrado inteligente...")
    prefiltro = prefiltrar_clases(clases, salones)

    imposibles    = prefiltro["imposibles"]
    con_advertencia = prefiltro["advertencias"]
    asignables    = prefiltro["asignables"]

    # Las clases con advertencia SÍ entran al solver (junto con las asignables)
    clases_para_solver = asignables + con_advertencia

    # ── FASE 1: Greedy con MRV + Score ────────────────────────────────────────
    print(f"\n⏳ FASE 1 — Greedy con MRV + Score ({len(clases_para_solver)} clases)...")
    clases_ordenadas = ordenar_clases_por_mrv(clases_para_solver, salones)

    estado          = EstadoSolver(salones)
    asignadas:     list[dict] = []
    no_asignadas:  list[dict] = []
    carga_por_dia:   dict[str, int] = {dia: 0 for dia in DIAS_SEMANA}
    carga_por_bloque: dict[str, int] = {}

    for clase in clases_ordenadas:
        horario  = clase["horario"]
        profesor = clase["profesor"]

        # Obtener TODOS los salones válidos (hard constraints)
        salones_validos = [s for s in salones if es_valida_asignacion(clase, s)]

        if not salones_validos:
            clase["razon_no_asignacion"] = (
                f"Ningún salón cumple los requisitos: "
                f"{'PC ' if clase.get('requiere_computadores') else ''}"
                f"{'Lab ' if clase.get('requiere_laboratorio') else ''}"
                f"{'VB ' if clase.get('requiere_videobeam') else ''}"
                f"para {clase['estudiantes']} estudiantes"
            )
            no_asignadas.append(clase)
            continue

        # Ordenar salones por SCORE (soft constraints) — no tomar el primero
        salones_scored = sorted(
            salones_validos,
            key=lambda s: score_salon(s, clase, carga_por_bloque)
        )

        # Ordenar días por menor carga (balanceo)
        dias_balanceados = sorted(DIAS_SEMANA, key=lambda d: (carga_por_dia[d], d))

        asignado = False
        for dia in dias_balanceados:
            for salon in salones_scored:
                if (estado.salon_disponible(salon["id"], dia, horario)
                        and estado.profesor_libre(profesor, dia, horario)):
                    estado.asignar(salon["id"], profesor, dia, horario)
                    carga_por_dia[dia] += 1
                    bloque = salon.get("bloque", "")
                    carga_por_bloque[bloque] = carga_por_bloque.get(bloque, 0) + 1

                    asignadas.append({
                        **clase,
                        "dia_asignado":    dia,
                        "salon_asignado":  salon["id"],
                        "bloque_salon":    salon.get("bloque", ""),
                        "capacidad_salon": salon["capacidad"],
                        "desperdicio":     salon["capacidad"] - int(clase["estudiantes"]),
                    })
                    asignado = True
                    break
            if asignado:
                break

        if not asignado:
            # Diagnóstico: por qué no se pudo asignar
            dias_intentados = len(DIAS_SEMANA)
            salones_ocupados = sum(
                1 for s in salones_scored
                if not any(estado.salon_disponible(s["id"], d, horario) for d in DIAS_SEMANA)
            )
            prof_ocupado = sum(
                1 for d in DIAS_SEMANA
                if not estado.profesor_libre(profesor, d, horario)
            )

            if prof_ocupado >= 5:
                razon = f"Profesor '{profesor}' ya tiene clases en los 5 días para horario {horario}"
            elif salones_ocupados == len(salones_scored):
                razon = f"Los {len(salones_scored)} salones compatibles están ocupados en todos los días para {horario}"
            else:
                razon = (
                    f"Saturación: {len(salones_scored)} salones compatibles, "
                    f"profesor ocupado {prof_ocupado}/5 días, "
                    f"combinación día+salón+profesor no encontrada"
                )

            clase["razon_no_asignacion"] = razon
            no_asignadas.append(clase)

    print(f"   Asignadas en Fase 1: {len(asignadas)} | Sin asignar: {len(no_asignadas)}")

    # ── FASE 2: Backtracking dirigido ─────────────────────────────────────────
    print("⏳ FASE 2 — Backtracking dirigido...")

    recuperadas = 0
    siguen_sin  = []

    for clase_pendiente in no_asignadas:
        horario_p  = clase_pendiente["horario"]
        profesor_p = clase_pendiente["profesor"]
        asignada   = False

        salones_validos_p = sorted(
            [s for s in salones if es_valida_asignacion(clase_pendiente, s)],
            key=lambda s: score_salon(s, clase_pendiente, carga_por_bloque)
        )
        dias_balanceados_p = sorted(DIAS_SEMANA, key=lambda d: (carga_por_dia[d], d))

        for dia_p in dias_balanceados_p:
            if asignada:
                break
            if not estado.profesor_libre(profesor_p, dia_p, horario_p):
                continue

            for salon_obj in salones_validos_p:
                conflictos = [
                    a for a in asignadas
                    if a["salon_asignado"] == salon_obj["id"]
                    and a["dia_asignado"]  == dia_p
                    and horarios_se_solapan(horario_p, a["horario"])
                ]

                # Salón libre → asignar directamente
                if not conflictos:
                    estado.asignar(salon_obj["id"], profesor_p, dia_p, horario_p)
                    carga_por_dia[dia_p] += 1
                    bloque = salon_obj.get("bloque", "")
                    carga_por_bloque[bloque] = carga_por_bloque.get(bloque, 0) + 1
                    asignadas.append({
                        **clase_pendiente,
                        "dia_asignado":    dia_p,
                        "salon_asignado":  salon_obj["id"],
                        "bloque_salon":    bloque,
                        "capacidad_salon": salon_obj["capacidad"],
                        "desperdicio":     salon_obj["capacidad"] - int(clase_pendiente["estudiantes"]),
                        "recuperada_por_backtracking": True,
                    })
                    asignada = True
                    recuperadas += 1
                    break

                # 1 conflicto → intentar mover la clase bloqueante
                if len(conflictos) == 1:
                    clase_bloq = conflictos[0]
                    prof_bloq  = clase_bloq["profesor"]
                    hora_bloq  = clase_bloq["horario"]

                    alternativo = None
                    for dia_alt in DIAS_SEMANA:
                        if alternativo:
                            break
                        for salon_alt in sorted(
                            [s for s in salones if es_valida_asignacion(clase_bloq, s)],
                            key=lambda s: score_salon(s, clase_bloq, carga_por_bloque)
                        ):
                            if salon_alt["id"] == salon_obj["id"] and dia_alt == dia_p:
                                continue
                            if (estado.salon_disponible(salon_alt["id"], dia_alt, hora_bloq)
                                    and estado.profesor_libre(prof_bloq, dia_alt, hora_bloq)):
                                alternativo = (salon_alt, dia_alt)
                                break

                    if not alternativo:
                        continue

                    salon_alt, dia_alt = alternativo

                    # Reasignar clase bloqueante
                    estado.desasignar(clase_bloq["salon_asignado"], clase_bloq["profesor"], clase_bloq["dia_asignado"], clase_bloq["horario"])
                    estado.asignar(salon_alt["id"], prof_bloq, dia_alt, hora_bloq)
                    carga_por_dia[clase_bloq["dia_asignado"]] -= 1
                    carga_por_dia[dia_alt] += 1

                    idx = next(i for i, a in enumerate(asignadas) if a is clase_bloq)
                    asignadas[idx] = {
                        **clase_bloq,
                        "dia_asignado":    dia_alt,
                        "salon_asignado":  salon_alt["id"],
                        "bloque_salon":    salon_alt.get("bloque", ""),
                        "capacidad_salon": salon_alt["capacidad"],
                        "desperdicio":     salon_alt["capacidad"] - int(clase_bloq["estudiantes"]),
                        "reasignada_por_backtracking": True,
                    }

                    # Asignar clase pendiente
                    estado.asignar(salon_obj["id"], profesor_p, dia_p, horario_p)
                    carga_por_dia[dia_p] += 1
                    asignadas.append({
                        **clase_pendiente,
                        "dia_asignado":    dia_p,
                        "salon_asignado":  salon_obj["id"],
                        "bloque_salon":    salon_obj.get("bloque", ""),
                        "capacidad_salon": salon_obj["capacidad"],
                        "desperdicio":     salon_obj["capacidad"] - int(clase_pendiente["estudiantes"]),
                        "recuperada_por_backtracking": True,
                    })
                    asignada = True
                    recuperadas += 1
                    break

        if not asignada:
            siguen_sin.append(clase_pendiente)

    print(f"   Recuperadas en Fase 2: {recuperadas}")
    print(f"   Sin asignar final:     {len(siguen_sin) + len(imposibles)}")

    # Agregar las imposibles a la lista final de no asignadas
    todas_no_asignadas = siguen_sin + imposibles

    return {"asignadas": asignadas, "no_asignadas": todas_no_asignadas}
