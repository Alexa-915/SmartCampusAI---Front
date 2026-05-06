from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class Asignacion(Base):
    __tablename__ = "asignaciones"

    id               = Column(Integer, primary_key=True, index=True)
    # Cada resultado pertenece al dataset con el que se corrió el solver
    dataset_id       = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)

    materia          = Column(String)
    grupo            = Column(String)
    profesor         = Column(String)
    tipo             = Column(String)
    horario          = Column(String)
    estudiantes      = Column(Integer)
    dia_asignado     = Column(String)
    salon_asignado   = Column(String)
    bloque_salon     = Column(String)
    capacidad_salon  = Column(Integer)
    desperdicio      = Column(Integer)
    requiere_vb      = Column(Boolean, default=False)
    requiere_pc      = Column(Boolean, default=False)
    requiere_lab     = Column(Boolean, default=False)
