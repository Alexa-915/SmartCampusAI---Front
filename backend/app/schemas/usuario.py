from pydantic import BaseModel, EmailStr
from enum import Enum


class Rol(str, Enum):
    admin  = "admin"
    viewer = "viewer"


class UsuarioCreate(BaseModel):
    nombre:    str
    email:     EmailStr
    contraseña: str
    rol:       Rol = Rol.viewer


class UsuarioOut(BaseModel):
    id:     int
    nombre: str
    email:  str
    rol:    Rol

    class Config:
        from_attributes = True


class LoginData(BaseModel):
    email:     EmailStr
    contraseña: str


class Token(BaseModel):
    access_token: str
    token_type:   str
    usuario:      UsuarioOut