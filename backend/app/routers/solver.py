from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.asignacion import Asignacion
from app.models.clase import Clase
from app.models.salon import Salon
from app.models.dataset import Dataset
from app.schemas.asignacion import AsignacionOut
import sys
import os

# El motor CSP vive dentro del repo en backend/csp_engine/
CSP_ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "csp_engine")
sys.path.insert(0, os.path.abspath(CSP_ROOT))

from src.csp.solver import resolver_csp

router = APIRouter(prefix="/api", tags=["solver"])


def _clases_a_dict(clases: list[Clase]) -> list[dict]:
    """
    Convierte los objetos Clase de la BD al formato que espera el solver.
    El solver necesita exactamente estos nombres de clave.
    """
    return [
        {
            "materia":               c.materia,
            "grupo":                 c.grupo,
            "profesor":              c.profesor,
            "tipo":                  c.tipo,
            "horario":               c.horario,
            "estudiantes":           c.estudiantes,
            "requiere_videobeam":    c.requiere_videobeam,
            "requiere_computadores": c.requiere_computadores,
            "requiere_laboratorio":  c.requiere_laboratorio,
        }
        for c in clases
    ]


def _salones_a_dict(salones: list[Salon]) -> list[dict]:
    """
    Convierte los objetos Salon de la BD al formato que espera el solver.
    El solver usa "id" como identificador del salón (el código, ej: "A-101").
    """
    return [
        {
            "id":                 s.codigo,
            "bloque":             s.bloque,
            "capacidad":          s.capacidad,
            "tipologia":          s.tipologia,
            "tiene_videobeam":    s.tiene_videobeam,
            "tiene_computadores": s.tiene_computadores,
            "es_laboratorio":     s.es_laboratorio,
        }
        for s in salones
    ]


@router.post("/resolver/{dataset_id}")
def resolver(dataset_id: int, db: Session = Depends(get_db)):
    """
    Corre el solver CSP usando los datos del dataset indicado
    y guarda los resultados en la tabla de asignaciones.
    """
    # Verificar que el dataset existe
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    # Cargar clases y salones desde la BD
    clases_bd  = db.query(Clase).filter(Clase.dataset_id == dataset_id).all()
    salones_bd = db.query(Salon).filter(Salon.dataset_id == dataset_id).all()

    if not clases_bd:
        raise HTTPException(status_code=400, detail="El dataset no tiene clases cargadas")
    if not salones_bd:
        raise HTTPException(status_code=400, detail="El dataset no tiene salones cargados")

    # Convertir al formato que espera el solver
    clases  = _clases_a_dict(clases_bd)
    salones = _salones_a_dict(salones_bd)

    # Correr el solver
    resultado = resolver_csp(clases, salones)

    # Limpiar asignaciones anteriores de este dataset y guardar las nuevas
    db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).delete()

    for a in resultado["asignadas"]:
        db.add(Asignacion(
            dataset_id      = dataset_id,
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

    total_clases = len(clases)
    return {
        "dataset_id":   dataset_id,
        "asignadas":    len(resultado["asignadas"]),
        "no_asignadas": len(resultado["no_asignadas"]),
        "pct_exito":    round(len(resultado["asignadas"]) / total_clases * 100, 1),
    }


@router.get("/asignaciones", response_model=list[AsignacionOut])
def get_asignaciones(dataset_id: int, db: Session = Depends(get_db)):
    """Devuelve todas las asignaciones de un dataset. Requiere ?dataset_id=X"""
    return db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).all()


@router.get("/resumen")
def get_resumen(dataset_id: int, db: Session = Depends(get_db)):
    """Devuelve métricas generales de un dataset."""
    total   = db.query(Asignacion).filter(Asignacion.dataset_id == dataset_id).count()
    por_dia = {}
    for dia in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]:
        por_dia[dia] = (
            db.query(Asignacion)
            .filter(Asignacion.dataset_id == dataset_id, Asignacion.dia_asignado == dia)
            .count()
        )

    return {
        "dataset_id":      dataset_id,
        "total_asignadas": total,
        "por_dia":         por_dia,
    }
