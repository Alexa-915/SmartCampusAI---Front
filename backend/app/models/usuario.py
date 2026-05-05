from sqlalchemy import Column, Integer, String, Enum
from app.database import Base
import enum


class Rol(str, enum.Enum):
    admin  = "admin"
    viewer = "viewer"


class Usuario(Base):
    __tablename__ = "usuarios"

    id         = Column(Integer, primary_key=True, index=True)
    nombre     = Column(String, nullable=False)
    email      = Column(String, unique=True, index=True, nullable=False)
    contraseña = Column(String, nullable=False)
    rol        = Column(Enum(Rol), default=Rol.viewer)