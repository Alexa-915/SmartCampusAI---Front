from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.clase import Clase
from app.models.dataset import Dataset
from app.schemas.clase import ClaseCreate, ClaseUpdate, ClaseOut

router = APIRouter(prefix="/api/clases", tags=["clases"])


def _verificar_dataset(dataset_id: int, db: Session):
    """Helper para verificar que el dataset existe antes de operar."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")


def _verificar_duplicado_clase(db: Session, dataset_id: int, materia: str, grupo: str, excluir_id: int = None):
    """Verifica que no exista otra clase con la misma materia+grupo en el dataset."""
    query = db.query(Clase).filter(
        Clase.dataset_id == dataset_id,
        Clase.materia == materia,
        Clase.grupo == grupo,
    )
    if excluir_id:
        query = query.filter(Clase.id != excluir_id)
    if query.first():
        raise HTTPException(
            status_code=409,
            detail=f'Ya existe una clase "{materia}" con el grupo "{grupo}" en este dataset.'
        )


@router.get("/", response_model=list[ClaseOut])
def listar_clases(dataset_id: int, db: Session = Depends(get_db)):
    """Lista todas las clases de un dataset. Requiere ?dataset_id=X"""
    _verificar_dataset(dataset_id, db)
    return db.query(Clase).filter(Clase.dataset_id == dataset_id).all()


@router.get("/{clase_id}", response_model=ClaseOut)
def obtener_clase(clase_id: int, db: Session = Depends(get_db)):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    return clase


@router.post("/", response_model=ClaseOut, status_code=status.HTTP_201_CREATED)
def crear_clase(datos: ClaseCreate, db: Session = Depends(get_db)):
    """Crea una clase manualmente en un dataset."""
    _verificar_dataset(datos.dataset_id, db)
    _verificar_duplicado_clase(db, datos.dataset_id, datos.materia, datos.grupo)

    clase = Clase(**datos.model_dump())
    db.add(clase)
    db.commit()
    db.refresh(clase)
    return clase


@router.put("/{clase_id}", response_model=ClaseOut)
def actualizar_clase(clase_id: int, datos: ClaseUpdate, db: Session = Depends(get_db)):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    # Determinar los valores finales para validar duplicados
    materia_final = datos.materia if datos.materia is not None else clase.materia
    grupo_final   = datos.grupo   if datos.grupo   is not None else clase.grupo
    _verificar_duplicado_clase(db, clase.dataset_id, materia_final, grupo_final, excluir_id=clase.id)

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(clase, campo, valor)

    db.commit()
    db.refresh(clase)
    return clase


@router.delete("/{clase_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_clase(clase_id: int, db: Session = Depends(get_db)):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    db.delete(clase)
    db.commit()
