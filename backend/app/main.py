from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import solver, auth, datasets, clases, salones, upload
import os

app = FastAPI(
    title="SmartCampusAI API",
    description="API para el sistema de asignación de salones universitarios",
    version="1.0.0"
)

# Orígenes permitidos: local en dev, Vercel en producción
# FRONTEND_URL se configura como variable de entorno en Render
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in ALLOWED_ORIGINS if o],  # filtra strings vacíos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solver.router)
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(clases.router)
app.include_router(salones.router)
app.include_router(upload.router)

@app.on_event("startup")
def startup():
    from app.database import Base, engine
    import app.models  # asegura que todos los modelos estén registrados
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "SmartCampusAI API corriendo"}