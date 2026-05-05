from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asignacion import Asignacion
from app.schemas.asignacion import AsignacionOut
import sys
import os

# Apuntar al proyecto CSP original
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "SmartCampusAI"))

from src.data.loader import cargar_salones, cargar_clases
from src.csp.solver import resolver_csp

router = APIRouter(prefix="/api", tags=["solver"])

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "SmartCampusAI", "data")


@router.post("/resolver")
def resolver(db: Session = Depends(get_db)):
    """Corre el solver CSP y guarda los resultados en la BD."""

    # 1. Cargar datos
    salones = cargar_salones(os.path.join(DATA_PATH, "Salones.xlsx"))
    clases  = cargar_clases(os.path.join(DATA_PATH, "Clases.xlsx"))

    # 2. Correr solver
    resultado = resolver_csp(clases, salones)

    # 3. Limpiar resultados anteriores
    db.query(Asignacion).delete()
    db.commit()

    # 4. Guardar nuevos resultados
    for a in resultado["asignadas"]:
        db.add(Asignacion(
            materia         = a["materia"],
            grupo           = a["grupo"],
            profesor        = a["profesor"],
            tipo            = a["tipo"],
            horario         = a["horario"],
            estudiantes     = int(a["estudiantes"]),
            dia_asignado    = a["dia_asignado"],
            salon_asignado  = a["salon_asignado"],
            bloque_salon    = a["bloque_salon"],
            capacidad_salon = a["capacidad_salon"],
            desperdicio     = a["desperdicio"],
            requiere_vb     = bool(a.get("requiere_videobeam", False)),
            requiere_pc     = bool(a.get("requiere_computadores", False)),
            requiere_lab    = bool(a.get("requiere_laboratorio", False)),
        ))
    db.commit()

    return {
        "asignadas":    len(resultado["asignadas"]),
        "no_asignadas": len(resultado["no_asignadas"]),
        "pct_exito":    round(len(resultado["asignadas"]) / 329 * 100, 1)
    }


@router.get("/asignaciones", response_model=list[AsignacionOut])
def get_asignaciones(db: Session = Depends(get_db)):
    """Devuelve todas las asignaciones guardadas en la BD."""
    return db.query(Asignacion).all()


@router.get("/resumen")
def get_resumen(db: Session = Depends(get_db)):
    """Devuelve métricas generales."""
    total     = db.query(Asignacion).count()
    por_dia   = {}
    for dia in ["Lunes","Martes","Miércoles","Jueves","Viernes"]:
        por_dia[dia] = db.query(Asignacion).filter(Asignacion.dia_asignado == dia).count()

    return {
        "total_asignadas": total,
        "por_dia":         por_dia,
    }