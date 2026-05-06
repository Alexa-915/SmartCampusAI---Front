from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class Clase(Base):
    """
    Representa una clase del archivo Clases.xlsx.
    Cada clase pertenece a un dataset específico.
    """
    __tablename__ = "clases"

    id                    = Column(Integer, primary_key=True, index=True)
    dataset_id            = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)

    # Datos básicos de la clase
    programa              = Column(String, nullable=True)
    materia               = Column(String, nullable=False)
    grupo                 = Column(String, nullable=False)
    profesor              = Column(String, nullable=False)
    tipo                  = Column(String, nullable=False)   # ej: "Teórica", "Práctica"
    horario               = Column(String, nullable=False)   # ej: "7:00–9:00"
    duracion              = Column(String, nullable=True)
    estudiantes           = Column(Integer, nullable=False)

    # Requisitos especiales
    requiere_videobeam    = Column(Boolean, default=False)
    requiere_computadores = Column(Boolean, default=False)
    requiere_laboratorio  = Column(Boolean, default=False)
