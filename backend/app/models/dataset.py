from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from app.database import Base


class Dataset(Base):
    """
    Un dataset agrupa un par de archivos: clases + salones.
    Cada dataset pertenece a un usuario específico.
    """
    __tablename__ = "datasets"

    id          = Column(Integer, primary_key=True, index=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    nombre      = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    creado_en   = Column(DateTime, server_default=func.now())
