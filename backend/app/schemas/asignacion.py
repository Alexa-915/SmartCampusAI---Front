from pydantic import BaseModel


class AsignacionBase(BaseModel):
    materia:         str
    grupo:           str
    profesor:        str
    tipo:            str
    horario:         str
    estudiantes:     int
    dia_asignado:    str
    salon_asignado:  str
    bloque_salon:    str
    capacidad_salon: int
    desperdicio:     int
    requiere_vb:     bool
    requiere_pc:     bool
    requiere_lab:    bool


class AsignacionOut(AsignacionBase):
    id:         int
    dataset_id: int

    class Config:
        from_attributes = True
