from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dataset import Dataset
from app.models.clase import Clase
from app.models.salon import Salon
from app.models.usuario import Usuario
from app.auth import get_usuario_actual
import pandas as pd
import io

router = APIRouter(prefix="/api/datasets", tags=["upload"])


# ── Helpers de parseo (misma lógica que el loader.py del CSP) ──────────────

def _normalizar_bool(serie: pd.Series) -> pd.Series:
    """Convierte 'Si'/'No' a True/False."""
    return (
        serie.astype(str).str.strip().str.lower()
        .map({"si": True, "sí": True, "no": False, "true": True, "false": False})
        .fillna(False)
    )


def _parsear_clases(contenido: bytes) -> list[dict]:
    """Lee el Excel de clases y devuelve lista de dicts listos para insertar."""
    df = pd.read_excel(io.BytesIO(contenido))
    df.columns = df.columns.str.strip().str.lower()

    # Renombrar columnas al formato interno
    df = df.rename(columns={
        "programa":              "programa",
        "materia":               "materia",
        "grupo":                 "grupo",
        "profesor":              "profesor",
        "tipo":                  "tipo",
        "horario":               "horario",
        "duración":              "duracion",
        "duracion":              "duracion",
        "requiere_videobeam":    "requiere_videobeam",
        "requiere_computadores": "requiere_computadores",
        "requiere_laboratorio":  "requiere_laboratorio",
        "cantidad estudiantes":  "estudiantes",
        "estudiantes":           "estudiantes",
    })

    # Verificar columnas mínimas requeridas
    requeridas = {"materia", "grupo", "profesor", "tipo", "horario", "estudiantes"}
    faltantes  = requeridas - set(df.columns)
    if faltantes:
        raise ValueError(f"El archivo de clases no tiene las columnas: {faltantes}")

    # Limpiar y convertir tipos
    df["requiere_videobeam"]    = _normalizar_bool(df.get("requiere_videobeam",    pd.Series(["no"] * len(df))))
    df["requiere_computadores"] = _normalizar_bool(df.get("requiere_computadores", pd.Series(["no"] * len(df))))
    df["requiere_laboratorio"]  = _normalizar_bool(df.get("requiere_laboratorio",  pd.Series(["no"] * len(df))))
    df["estudiantes"]           = pd.to_numeric(df["estudiantes"], errors="coerce").fillna(0).astype(int)
    df["horario"]               = df["horario"].astype(str).str.strip().str.replace("-", "–", regex=False)

    # Columnas opcionales
    if "programa" not in df.columns:
        df["programa"] = None
    if "duracion" not in df.columns:
        df["duracion"] = None

    campos = ["programa", "materia", "grupo", "profesor", "tipo", "horario",
              "duracion", "estudiantes", "requiere_videobeam",
              "requiere_computadores", "requiere_laboratorio"]

    return df[campos].where(pd.notna(df[campos]), None).to_dict(orient="records")


def _parsear_salones(contenido: bytes) -> list[dict]:
    """Lee el Excel de salones y devuelve lista de dicts listos para insertar."""
    df = pd.read_excel(io.BytesIO(contenido))
    df.columns = df.columns.str.strip().str.lower()

    df = df.rename(columns={
        "código":             "codigo",
        "codigo":             "codigo",
        "bloque":             "bloque",
        "capacidad":          "capacidad_raw",
        "tipología":          "tipologia",
        "tipologia":          "tipologia",
        "tiene_videobeam":    "tiene_videobeam",
        "tiene_computadores": "tiene_computadores",
        "es_laboratorio":     "es_laboratorio",
    })

    requeridas = {"codigo", "capacidad_raw"}
    faltantes  = requeridas - set(df.columns)
    if faltantes:
        raise ValueError(f"El archivo de salones no tiene las columnas: {faltantes}")

    # Extraer número de capacidad (ej: "40 Mediano" → 40)
    df["capacidad"] = (
        df["capacidad_raw"].astype(str)
        .str.replace("\xa0", " ", regex=False)
        .str.extract(r"(\d+)")[0]
        .fillna(0).astype(int)
    )

    df["tiene_videobeam"]    = _normalizar_bool(df.get("tiene_videobeam",    pd.Series(["no"] * len(df))))
    df["tiene_computadores"] = _normalizar_bool(df.get("tiene_computadores", pd.Series(["no"] * len(df))))
    df["es_laboratorio"]     = _normalizar_bool(df.get("es_laboratorio",     pd.Series(["no"] * len(df))))

    if "bloque"   not in df.columns: df["bloque"]   = None
    if "tipologia" not in df.columns: df["tipologia"] = None

    campos = ["codigo", "bloque", "capacidad", "tipologia",
              "tiene_videobeam", "tiene_computadores", "es_laboratorio"]

    return df[campos].where(pd.notna(df[campos]), None).to_dict(orient="records")


# ── Endpoints de upload ────────────────────────────────────────────────────

@router.post("/{dataset_id}/upload/clases")
async def upload_clases(
    dataset_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """
    Sube un Excel de clases a un dataset.
    Reemplaza todas las clases existentes del dataset con las del archivo.
    """
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    contenido = await archivo.read()

    try:
        clases_data = _parsear_clases(contenido)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=422, detail="No se pudo leer el archivo. Verifica el formato.")

    # Borrar clases anteriores del dataset y cargar las nuevas
    db.query(Clase).filter(Clase.dataset_id == dataset_id).delete()
    for c in clases_data:
        db.add(Clase(dataset_id=dataset_id, **c))
    db.commit()

    return {"mensaje": f"{len(clases_data)} clases cargadas correctamente"}


@router.post("/{dataset_id}/upload/salones")
async def upload_salones(
    dataset_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """
    Sube un Excel de salones a un dataset.
    Reemplaza todos los salones existentes del dataset con los del archivo.
    """
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    if not archivo.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos Excel (.xlsx, .xls)")

    contenido = await archivo.read()

    try:
        salones_data = _parsear_salones(contenido)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=422, detail="No se pudo leer el archivo. Verifica el formato.")

    db.query(Salon).filter(Salon.dataset_id == dataset_id).delete()
    for s in salones_data:
        db.add(Salon(dataset_id=dataset_id, **s))
    db.commit()

    return {"mensaje": f"{len(salones_data)} salones cargados correctamente"}


@router.get("/{dataset_id}/conteo")
def conteo_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Devuelve cuántas clases y salones tiene un dataset."""
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    n_clases  = db.query(Clase).filter(Clase.dataset_id == dataset_id).count()
    n_salones = db.query(Salon).filter(Salon.dataset_id == dataset_id).count()

    return {
        "dataset_id":     dataset_id,
        "clases":         n_clases,
        "salones":        n_salones,
        "clases_cargadas":  n_clases > 0,   # indica si ya se subió un archivo
        "salones_cargados": n_salones > 0,
    }
