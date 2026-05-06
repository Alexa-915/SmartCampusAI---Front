from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class Salon(Base):
    """
    Representa un salón del archivo Salones.xlsx.
    Cada salón pertenece a un dataset específico.
    """
    __tablename__ = "salones"

    id                  = Column(Integer, primary_key=True, index=True)
    dataset_id          = Column(Integer, ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)

    # Datos del salón
    codigo              = Column(String, nullable=False)   # ej: "A-101"
    bloque              = Column(String, nullable=True)
    capacidad           = Column(Integer, nullable=False)
    tipologia           = Column(String, nullable=True)    # ej: "Aula", "Lab"

    # Equipamiento disponible
    tiene_videobeam     = Column(Boolean, default=False)
    tiene_computadores  = Column(Boolean, default=False)
    es_laboratorio      = Column(Boolean, default=False)
