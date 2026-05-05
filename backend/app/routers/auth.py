from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, LoginData, Token
from app.auth import encriptar_contraseña, verificar_contraseña, crear_token

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