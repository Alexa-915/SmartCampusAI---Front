from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import solver
from app.routers import auth

app = FastAPI(
    title="SmartCampusAI API",
    description="API para el sistema de asignación de salones universitarios",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(solver.router)
app.include_router(auth.router)

@app.on_event("startup")
def startup():
    from app.database import Base, engine
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "SmartCampusAI API corriendo ✅"}