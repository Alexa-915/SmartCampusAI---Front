from pydantic import BaseModel
from typing import Optional


class ClaseBase(BaseModel):
    programa:              Optional[str] = None
    materia:               str
    grupo:                 str
    profesor:              str
    tipo:                  str
    horario:               str
    duracion:              Optional[str] = None
    estudiantes:           int
    requiere_videobeam:    bool = False
    requiere_computadores: bool = False
    requiere_laboratorio:  bool = False


class ClaseCreate(ClaseBase):
    dataset_id: int


class ClaseUpdate(BaseModel):
    # Todos opcionales para poder actualizar solo lo que cambia
    programa:              Optional[str]  = None
    materia:               Optional[str]  = None
    grupo:                 Optional[str]  = None
    profesor:              Optional[str]  = None
    tipo:                  Optional[str]  = None
    horario:               Optional[str]  = None
    duracion:              Optional[str]  = None
    estudiantes:           Optional[int]  = None
    requiere_videobeam:    Optional[bool] = None
    requiere_computadores: Optional[bool] = None
    requiere_laboratorio:  Optional[bool] = None


class ClaseOut(ClaseBase):
    id:         int
    dataset_id: int

    class Config:
        from_attributes = True
