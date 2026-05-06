from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dataset import Dataset
from app.schemas.dataset import DatasetCreate, DatasetUpdate, DatasetOut

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("/", response_model=list[DatasetOut])
def listar_datasets(db: Session = Depends(get_db)):
    """Devuelve todos los datasets ordenados por más reciente."""
    return db.query(Dataset).order_by(Dataset.creado_en.desc()).all()


@router.get("/{dataset_id}", response_model=DatasetOut)
def obtener_dataset(dataset_id: int, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    return dataset


@router.post("/", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
def crear_dataset(datos: DatasetCreate, db: Session = Depends(get_db)):
    """Crea un dataset nuevo (vacío, sin clases ni salones todavía)."""
    dataset = Dataset(**datos.model_dump())
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.put("/{dataset_id}", response_model=DatasetOut)
def actualizar_dataset(dataset_id: int, datos: DatasetUpdate, db: Session = Depends(get_db)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    # Solo actualizar los campos que vienen en el body
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(dataset, campo, valor)

    db.commit()
    db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Elimina el dataset y en cascada sus clases y salones."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    db.delete(dataset)
    db.commit()
