from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class Dataset(Base):
    """
    Un dataset agrupa un par de archivos: clases + salones.
    Así podemos tener múltiples conjuntos de datos para hacer pruebas.
    """
    __tablename__ = "datasets"

    id          = Column(Integer, primary_key=True, index=True)
    nombre      = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    creado_en   = Column(DateTime, server_default=func.now())
