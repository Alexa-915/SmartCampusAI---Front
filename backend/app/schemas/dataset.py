from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DatasetCreate(BaseModel):
    nombre:      str
    descripcion: Optional[str] = None


class DatasetUpdate(BaseModel):
    nombre:      Optional[str] = None
    descripcion: Optional[str] = None


class DatasetOut(BaseModel):
    id:          int
    usuario_id:  int
    nombre:      str
    descripcion: Optional[str]
    creado_en:   datetime

    class Config:
        from_attributes = True
