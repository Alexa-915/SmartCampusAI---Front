# =============================================================================
#  SmartCampusAI — src/reportes/consola.py
#  Reporte de resultados en consola
# =============================================================================

from collections import defaultdict
from src.utils.horarios import parsear_horario

DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]


def mostrar_resultados(resultado: dict) -> None:
    """
    Imprime un resumen claro y detallado de las asignaciones
    realizadas por el solver CSP.
    """
    asignadas    = resultado["asignadas"]
    no_asignadas = resultado["no_asignadas"]
    total        = len(asignadas) + len(no_asignadas)
    pct_exito    = len(asignadas) / total * 100 if total > 0 else 0

    recuperadas = sum(1 for a in asignadas if a.get("recuperada_por_backtracking"))
    reasignadas = sum(1 for a in asignadas if a.get("reasignada_por_backtracking"))

    print("\n" + "=" * 65)
    print("  RESULTADOS FINALES — SmartCampusAI (multi-día Lun–Vie)")
    print("=" * 65)
    print(f"  Total de clases:             {total}")
    print(f"  ✅ Asignadas:                {len(asignadas)}  ({pct_exito:.1f}%)")
    print(f"     → Fase 1 (Greedy MRV):    {len(asignadas) - recuperadas}")
    print(f"     → Fase 2 (Backtracking):  {recuperadas}")
    print(f"     → Reasignadas (BT):       {reasignadas}")
    print(f"  ❌ Sin asignar:              {len(no_asignadas)}  ({100 - pct_exito:.1f}%)")

    if asignadas:
        desperdicios = [a["desperdicio"] for a in asignadas]
        print(f"\n  Desperdicio promedio:        {sum(desperdicios)/len(desperdicios):.1f} sillas vacías")
        print(f"  Desperdicio mínimo/máximo:   {min(desperdicios)} / {max(desperdicios)}")

        por_dia: dict[str, int] = defaultdict(int)
        for a in asignadas:
            por_dia[a["dia_asignado"]] += 1
        print("\n  Distribución por día:")
        for d in DIAS_SEMANA:
            bar = "█" * (por_dia[d] // 3)
            print(f"    {d:10s}: {por_dia[d]:3d}  {bar}")

    print("\n── Muestra de asignaciones (primeras 8) ──────────────────────")
    for a in asignadas[:8]:
        bt = " ← BT" if a.get("recuperada_por_backtracking") else ""
        print(f"  {a['materia'][:28]:28s} {a['grupo']:7s} "
              f"→ {a['dia_asignado']:10s} {a['salon_asignado']:6s} "
              f"| {a['horario']:13s} "
              f"| -{a['desperdicio']} sillas{bt}")

    if no_asignadas:
        print(f"\n── Clases sin salón ({len(no_asignadas)}) ──────────────────────────────")
        for n in no_asignadas[:10]:
            reqs = []
            if n["requiere_laboratorio"]:  reqs.append("Lab")
            if n["requiere_computadores"]: reqs.append("PC")
            if n["requiere_videobeam"]:    reqs.append("VB")
            print(f"  ❌ {n['materia'][:28]:28s} {n['grupo']:7s} "
                  f"| {n['horario']:13s} "
                  f"| {n['estudiantes']} est. "
                  f"| Reqs: {', '.join(reqs) or 'ninguna'}")
        if len(no_asignadas) > 10:
            print(f"  ... y {len(no_asignadas) - 10} más")

    print("=" * 65)
