from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.salon import Salon
from app.models.dataset import Dataset
from app.schemas.salon import SalonCreate, SalonUpdate, SalonOut

router = APIRouter(prefix="/api/salones", tags=["salones"])


def _verificar_dataset(dataset_id: int, db: Session):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")


@router.get("/", response_model=list[SalonOut])
def listar_salones(dataset_id: int, db: Session = Depends(get_db)):
    """Lista todos los salones de un dataset. Requiere ?dataset_id=X"""
    _verificar_dataset(dataset_id, db)
    return db.query(Salon).filter(Salon.dataset_id == dataset_id).all()


@router.get("/{salon_id}", response_model=SalonOut)
def obtener_salon(salon_id: int, db: Session = Depends(get_db)):
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    return salon


@router.post("/", response_model=SalonOut, status_code=status.HTTP_201_CREATED)
def crear_salon(datos: SalonCreate, db: Session = Depends(get_db)):
    """Crea un salón manualmente en un dataset."""
    _verificar_dataset(datos.dataset_id, db)
    salon = Salon(**datos.model_dump())
    db.add(salon)
    db.commit()
    db.refresh(salon)
    return salon


@router.put("/{salon_id}", response_model=SalonOut)
def actualizar_salon(salon_id: int, datos: SalonUpdate, db: Session = Depends(get_db)):
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(salon, campo, valor)

    db.commit()
    db.refresh(salon)
    return salon


@router.delete("/{salon_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_salon(salon_id: int, db: Session = Depends(get_db)):
    salon = db.query(Salon).filter(Salon.id == salon_id).first()
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    db.delete(salon)
    db.commit()
