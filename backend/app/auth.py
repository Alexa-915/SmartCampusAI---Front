from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
import os

# Configuración
SECRET_KEY   = os.getenv("SECRET_KEY", "smartcampusai_secret_key_2024")
ALGORITHM    = "HS256"
EXPIRE_HORAS = 24

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def encriptar_contraseña(contraseña: str) -> str:
    return pwd_context.hash(contraseña)


def verificar_contraseña(contraseña: str, hash: str) -> bool:
    return pwd_context.verify(contraseña, hash)


def crear_token(data: dict) -> str:
    payload = data.copy()
    expira  = datetime.utcnow() + timedelta(hours=EXPIRE_HORAS)
    payload.update({"exp": expira})
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db:    Session = Depends(get_db)
) -> Usuario:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email   = payload.get("sub")
        if not email:
            raise error
    except JWTError:
        raise error

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise error
    return usuario


def require_admin(usuario: Usuario = Depends(get_usuario_actual)) -> Usuario:
    if usuario.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden realizar esta acción"
        )
    return usuario