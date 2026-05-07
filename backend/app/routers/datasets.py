from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dataset import Dataset
from app.models.usuario import Usuario
from app.schemas.dataset import DatasetCreate, DatasetUpdate, DatasetOut
from app.auth import get_usuario_actual

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("/", response_model=list[DatasetOut])
def listar_datasets(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Devuelve solo los datasets del usuario autenticado."""
    return (
        db.query(Dataset)
        .filter(Dataset.usuario_id == usuario.id)
        .order_by(Dataset.creado_en.desc())
        .all()
    )


@router.get("/{dataset_id}", response_model=DatasetOut)
def obtener_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    return dataset


@router.post("/", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
def crear_dataset(
    datos: DatasetCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Crea un dataset nuevo asociado al usuario autenticado."""
    dataset = Dataset(usuario_id=usuario.id, **datos.model_dump())
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    return dataset


@router.put("/{dataset_id}", response_model=DatasetOut)
def actualizar_dataset(
    dataset_id: int,
    datos: DatasetUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(dataset, campo, valor)

    db.commit()
    db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Elimina el dataset solo si pertenece al usuario."""
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    db.delete(dataset)
    db.commit()
