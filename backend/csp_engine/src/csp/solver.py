# =============================================================================
#  SmartCampusAI — src/csp/solver.py
#  Solver CSP con heurística MRV + Backtracking dirigido (multi-día)
# =============================================================================

from src.csp.restricciones import es_valida_asignacion
from src.csp.heuristicas   import ordenar_clases_por_mrv
from src.csp.estado        import EstadoSolver
from src.utils.horarios    import horarios_se_solapan

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


def resolver_csp(clases: list[dict], salones: list[dict]) -> dict:
    """
    Solver CSP en dos fases con soporte multi-día (Lunes–Viernes).

    Variable del CSP:  clase_i → (salón, día)
    El horario ya viene fijo en los datos; el solver elige el día.

    ─────────────────────────────────────────────────────────────────
    FASE 1 — Greedy con MRV + Balanceo de carga:
        1. Ordena clases por dificultad (MRV).
        2. Para cada clase, evalúa los días de menor a mayor carga
           actual (heurística de balanceo).
        3. Dentro de cada día, prueba salones ordenados por menor
           desperdicio de capacidad.
        4. Asigna la primera combinación (día, salón) válida.

    FASE 2 — Backtracking dirigido:
        Solo actúa sobre las clases no asignadas en la Fase 1.
        Para cada clase pendiente busca un (salón, día) que esté
        bloqueado por exactamente 1 clase ya asignada. Si esa clase
        tiene un (salón, día) alternativo disponible, se reasigna
        para liberar el espacio que necesita la pendiente.
    ─────────────────────────────────────────────────────────────────

    Retorna:
        {
            "asignadas":    [ {..., dia_asignado, salon_asignado, ...} ],
            "no_asignadas": [ {...} ]
        }
    """

    # ── FASE 1: Greedy con MRV ────────────────────────────────────────────────
    print("\n⏳ FASE 1 — Greedy con MRV (multi-día)...")
    clases_ordenadas = ordenar_clases_por_mrv(clases, salones)

    estado         = EstadoSolver(salones)
    asignadas:    list[dict] = []
    no_asignadas: list[dict] = []
    carga_por_dia: dict[str, int] = {dia: 0 for dia in DIAS_SEMANA}

    for clase in clases_ordenadas:
        horario  = clase["horario"]
        profesor = clase["profesor"]

        salones_validos = sorted(
            [s for s in salones if es_valida_asignacion(clase, s)],
            key=lambda s: s["capacidad"] - int(clase["estudiantes"])
        )
        dias_balanceados = sorted(DIAS_SEMANA, key=lambda d: (carga_por_dia[d], d))

        asignado = False
        for dia in dias_balanceados:
            for salon in salones_validos:
                if (estado.salon_disponible(salon["id"], dia, horario)
                        and estado.profesor_libre(profesor, dia, horario)):
                    estado.asignar(salon["id"], profesor, dia, horario)
                    carga_por_dia[dia] += 1
                    asignadas.append({
                        **clase,
                        "dia_asignado":    dia,
                        "salon_asignado":  salon["id"],
                        "bloque_salon":    salon["bloque"],
                        "capacidad_salon": salon["capacidad"],
                        "desperdicio":     salon["capacidad"] - int(clase["estudiantes"]),
                    })
                    asignado = True
                    break
            if asignado:
                break

        if not asignado:
            no_asignadas.append(clase)

    print(f"   Asignadas en Fase 1: {len(asignadas)} | Sin asignar: {len(no_asignadas)}")

    # ── FASE 2: Backtracking dirigido ─────────────────────────────────────────
    print("⏳ FASE 2 — Backtracking dirigido (multi-día)...")

    recuperadas = 0
    siguen_sin  = []

    for clase_pendiente in no_asignadas:
        horario_p  = clase_pendiente["horario"]
        profesor_p = clase_pendiente["profesor"]
        asignada   = False

        salones_validos_p = sorted(
            [s for s in salones if es_valida_asignacion(clase_pendiente, s)],
            key=lambda s: s["capacidad"] - int(clase_pendiente["estudiantes"])
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

                # Salón libre ese día → asignar directamente
                if not conflictos:
                    estado.asignar(salon_obj["id"], profesor_p, dia_p, horario_p)
                    carga_por_dia[dia_p] += 1
                    asignadas.append({
                        **clase_pendiente,
                        "dia_asignado":    dia_p,
                        "salon_asignado":  salon_obj["id"],
                        "bloque_salon":    salon_obj["bloque"],
                        "capacidad_salon": salon_obj["capacidad"],
                        "desperdicio":     salon_obj["capacidad"] - int(clase_pendiente["estudiantes"]),
                    })
                    asignada = True
                    recuperadas += 1
                    break

                # Exactamente 1 clase bloqueando → intentar moverla a otro día
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
                            key=lambda s: s["capacidad"] - int(clase_bloq["estudiantes"])
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

                    # Reasignar clase bloqueante → alternativo
                    estado.desasignar(
                        clase_bloq["salon_asignado"],
                        clase_bloq["profesor"],
                        clase_bloq["dia_asignado"],
                        clase_bloq["horario"]
                    )
                    estado.asignar(salon_alt["id"], prof_bloq, dia_alt, hora_bloq)
                    carga_por_dia[clase_bloq["dia_asignado"]] -= 1
                    carga_por_dia[dia_alt] += 1

                    idx = next(i for i, a in enumerate(asignadas) if a is clase_bloq)
                    asignadas[idx] = {
                        **clase_bloq,
                        "dia_asignado":    dia_alt,
                        "salon_asignado":  salon_alt["id"],
                        "bloque_salon":    salon_alt["bloque"],
                        "capacidad_salon": salon_alt["capacidad"],
                        "desperdicio":     salon_alt["capacidad"] - int(clase_bloq["estudiantes"]),
                        "reasignada_por_backtracking": True,
                    }

                    # Asignar clase pendiente al espacio liberado
                    estado.asignar(salon_obj["id"], profesor_p, dia_p, horario_p)
                    carga_por_dia[dia_p] += 1
                    asignadas.append({
                        **clase_pendiente,
                        "dia_asignado":    dia_p,
                        "salon_asignado":  salon_obj["id"],
                        "bloque_salon":    salon_obj["bloque"],
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
    print(f"   Sin asignar final:     {len(siguen_sin)}")

    return {"asignadas": asignadas, "no_asignadas": siguen_sin}
