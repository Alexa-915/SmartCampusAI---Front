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


@router.delete("/{dataset_id}/clases", status_code=204)
def eliminar_clases_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Elimina todas las clases de un dataset (sin borrar el dataset)."""
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    db.query(Clase).filter(Clase.dataset_id == dataset_id).delete()
    db.commit()


@router.delete("/{dataset_id}/salones", status_code=204)
def eliminar_salones_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """Elimina todos los salones de un dataset (sin borrar el dataset)."""
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")
    db.query(Salon).filter(Salon.dataset_id == dataset_id).delete()
    db.commit()


# ── Validación inteligente de Excel ────────────────────────────────────────

import re

def _extraer_hora(texto: str):
    """Extrae hora como minutos desde medianoche. Retorna None si no es válida."""
    texto = texto.strip()
    match = re.match(r"(\d{1,2}):(\d{2})", texto)
    if not match:
        return None
    h, m = int(match.group(1)), int(match.group(2))
    if h < 0 or h > 23 or m < 0 or m > 59:
        return None
    return h * 60 + m


def _validar_clases_data(clases_data: list[dict]) -> dict:
    """
    Valida un listado de clases parseadas.
    Reglas simples:
    - No duplicados (materia + grupo)
    - Horarios deben existir en el catálogo válido del sistema (slots de 30 min entre 6:00 y 21:00)
    """
    errores = []
    advertencias = []
    vistos = {}

    # Catálogo LITERAL de horas válidas del sistema — sin cálculos ni rangos
    horas_validas = {
        "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30",
        "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
        "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
        "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
        "19:00", "19:30", "20:00", "20:30", "21:00",
        # Con cero al inicio por si el Excel los trae así
        "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
    }

    for i, clase in enumerate(clases_data):
        fila = i + 2  # fila 1 es header en Excel

        materia  = (clase.get("materia") or "").strip()
        grupo    = (clase.get("grupo") or "").strip()
        horario  = (clase.get("horario") or "").strip()

        # 1. Duplicados materia + grupo (ÚNICO error crítico)
        if materia and grupo:
            clave = f"{materia.lower()}|{grupo.lower()}"
            if clave in vistos:
                errores.append({
                    "fila": fila,
                    "campo": "materia/grupo",
                    "valor": f"{materia} - {grupo}",
                    "mensaje": f'"{materia} - {grupo}" está duplicada (también en fila {vistos[clave]}).',
                    "tipo": "error",
                })
            else:
                vistos[clave] = fila

        # 2. Verificar que las horas existan en el catálogo del sistema
        if horario and "–" in horario:
            partes = horario.split("–")
            hora_inicio = partes[0].strip()
            hora_fin    = partes[1].strip() if len(partes) > 1 else ""

            if hora_inicio and hora_inicio not in horas_validas:
                advertencias.append({
                    "fila": fila,
                    "campo": "horario",
                    "valor": hora_inicio,
                    "mensaje": f"Fila {fila}: hora de inicio '{hora_inicio}' no existe en el catálogo del sistema.",
                    "tipo": "advertencia",
                })
            if hora_fin and hora_fin not in horas_validas:
                advertencias.append({
                    "fila": fila,
                    "campo": "horario",
                    "valor": hora_fin,
                    "mensaje": f"Fila {fila}: hora de fin '{hora_fin}' no existe en el catálogo del sistema.",
                    "tipo": "advertencia",
                })

    return {
        "total_filas": len(clases_data),
        "errores": errores,
        "advertencias": advertencias,
        "total_errores": len(errores),
        "total_advertencias": len(advertencias),
        "puede_cargar": True,
    }


@router.post("/{dataset_id}/validar/clases")
async def validar_clases(
    dataset_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """
    Valida un Excel de clases SIN guardarlo.
    Retorna errores, advertencias y un preview de los datos.
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

    # Ejecutar validaciones
    resultado = _validar_clases_data(clases_data)

    # Incluir preview de las primeras 20 filas
    resultado["preview"] = clases_data[:20]

    return resultado


# ── Validación de Salones ──────────────────────────────────────────────────

def _validar_salones_data(salones_data: list[dict]) -> dict:
    """
    Valida un listado de salones parseados y retorna errores y advertencias.
    Reglas:
    - No duplicados (codigo + bloque)
    - Capacidad válida (> 0 y < 1000)
    - Campos obligatorios presentes
    - Tipología y bloque no vacíos (advertencia)
    """
    errores = []
    advertencias = []
    vistos = {}  # para detectar duplicados codigo+bloque

    for i, salon in enumerate(salones_data):
        fila = i + 2  # +2 porque fila 1 es header

        codigo    = (salon.get("codigo") or "").strip()
        bloque    = (salon.get("bloque") or "").strip()
        capacidad = salon.get("capacidad", 0)
        tipologia = (salon.get("tipologia") or "").strip()

        # 1. Código vacío
        if not codigo:
            errores.append({
                "fila": fila,
                "campo": "codigo",
                "valor": "",
                "mensaje": f"Fila {fila}: el código del salón está vacío.",
                "tipo": "error",
            })
            continue

        # 2. Duplicados codigo + bloque
        clave = f"{codigo.lower()}|{bloque.lower()}"
        if clave in vistos:
            errores.append({
                "fila": fila,
                "campo": "codigo/bloque",
                "valor": f"{codigo} - {bloque}",
                "mensaje": f'Fila {fila}: "{codigo}" en "{bloque}" está duplicado (también en fila {vistos[clave]}).',
                "tipo": "error",
            })
        else:
            vistos[clave] = fila

        # 3. Capacidad inválida
        try:
            cap = int(capacidad)
        except (ValueError, TypeError):
            cap = -1

        if cap <= 0:
            errores.append({
                "fila": fila,
                "campo": "capacidad",
                "valor": str(capacidad),
                "mensaje": f"Fila {fila}: capacidad inválida ({capacidad}). Debe ser mayor a 0.",
                "tipo": "error",
            })
        elif cap > 500:
            advertencias.append({
                "fila": fila,
                "campo": "capacidad",
                "valor": str(cap),
                "mensaje": f"Fila {fila}: capacidad muy alta ({cap}). ¿Es correcto?",
                "tipo": "advertencia",
            })

        # 4. Bloque vacío (advertencia, no error)
        if not bloque:
            advertencias.append({
                "fila": fila,
                "campo": "bloque",
                "valor": "",
                "mensaje": f"Fila {fila}: el bloque está vacío para el salón '{codigo}'.",
                "tipo": "advertencia",
            })

        # 5. Tipología vacía (advertencia)
        if not tipologia:
            advertencias.append({
                "fila": fila,
                "campo": "tipologia",
                "valor": "",
                "mensaje": f"Fila {fila}: tipología vacía para '{codigo}'.",
                "tipo": "advertencia",
            })

    return {
        "total_filas": len(salones_data),
        "errores": errores,
        "advertencias": advertencias,
        "total_errores": len(errores),
        "total_advertencias": len(advertencias),
        "puede_cargar": True,  # salones siempre se pueden cargar (errores se marcan pero no bloquean)
    }


@router.post("/{dataset_id}/validar/salones")
async def validar_salones(
    dataset_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    """
    Valida un Excel de salones SIN guardarlo.
    Retorna errores, advertencias y preview.
    A diferencia de clases, los salones siempre se pueden cargar (errores no bloquean).
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

    resultado = _validar_salones_data(salones_data)
    resultado["preview"] = salones_data[:20]

    return resultado
