from pydantic import BaseModel
from typing import Optional


class SalonBase(BaseModel):
    codigo:             str
    bloque:             Optional[str] = None
    capacidad:          int
    tipologia:          Optional[str] = None
    tiene_videobeam:    bool = False
    tiene_computadores: bool = False
    es_laboratorio:     bool = False


class SalonCreate(SalonBase):
    dataset_id: int


class SalonUpdate(BaseModel):
    # Todos opcionales igual que ClaseUpdate
    codigo:             Optional[str]  = None
    bloque:             Optional[str]  = None
    capacidad:          Optional[int]  = None
    tipologia:          Optional[str]  = None
    tiene_videobeam:    Optional[bool] = None
    tiene_computadores: Optional[bool] = None
    es_laboratorio:     Optional[bool] = None


class SalonOut(SalonBase):
    id:         int
    dataset_id: int

    class Config:
        from_attributes = True
