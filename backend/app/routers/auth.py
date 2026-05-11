from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, LoginData, Token
from app.auth import encriptar_contraseña, verificar_contraseña, crear_token, get_usuario_actual

router = APIRouter(prefix="/api/auth", tags=["autenticación"])


@router.post("/register", response_model=UsuarioOut)
def register(datos: UsuarioCreate, db: Session = Depends(get_db)):
    # Verificar si el email ya existe
    existe = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    usuario = Usuario(
        nombre     = datos.nombre,
        email      = datos.email,
        contraseña = encriptar_contraseña(datos.contraseña),
        rol        = datos.rol,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.post("/login", response_model=Token)
def login(datos: LoginData, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == datos.email).first()

    if not usuario or not verificar_contraseña(datos.contraseña, usuario.contraseña):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    token = crear_token({"sub": usuario.email, "rol": usuario.rol})

    return Token(
        access_token = token,
        token_type   = "bearer",
        usuario      = usuario,
    )


@router.get("/me", response_model=UsuarioOut)
def get_me(db: Session = Depends(get_db), token: str = None):
    return {"message": "endpoint activo"}


class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva:  str


@router.put("/cambiar-password")
def cambiar_password(
    datos: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Cambia la contraseña del usuario autenticado."""
    # Verificar contraseña actual
    if not verificar_contraseña(datos.password_actual, usuario.contraseña):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )

    # Validar nueva contraseña
    if len(datos.password_nueva) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )

    # Actualizar
    usuario.contraseña = encriptar_contraseña(datos.password_nueva)
    db.commit()

    return {"mensaje": "Contraseña actualizada correctamente"}


@router.put("/actualizar-perfil")
def actualizar_perfil(
    datos: dict,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Actualiza el nombre del usuario autenticado."""
    if "nombre" in datos and datos["nombre"].strip():
        usuario.nombre = datos["nombre"].strip()
        db.commit()
        db.refresh(usuario)
    return {"mensaje": "Perfil actualizado", "nombre": usuario.nombre}