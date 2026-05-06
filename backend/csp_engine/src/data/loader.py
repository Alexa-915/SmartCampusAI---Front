# =============================================================================
#  SmartCampusAI — src/data/loader.py
#  Carga y limpieza de datos desde los archivos Excel
# =============================================================================

import pandas as pd


def cargar_salones(ruta: str) -> list[dict]:
    """
    Carga el archivo Excel de salones, limpia los datos y
    devuelve una lista de diccionarios listos para el solver.

    Columnas esperadas:
        Código, Bloque, Capacidad, Tipología,
        tiene_videobeam, tiene_computadores, es_laboratorio
    """
    df = pd.read_excel(ruta)
    df.columns = df.columns.str.strip().str.lower()

    df = df.rename(columns={
        "código":             "id",
        "bloque":             "bloque",
        "capacidad":          "capacidad_raw",
        "tipología":          "tipologia",
        "tiene_videobeam":    "tiene_videobeam",
        "tiene_computadores": "tiene_computadores",
        "es_laboratorio":     "es_laboratorio",
    })

    # Extraer número de la capacidad (ej: "40 Mediano" → 40)
    df["capacidad"] = (
        df["capacidad_raw"]
        .astype(str)
        .str.replace("\xa0", " ", regex=False)
        .str.extract(r"(\d+)")[0]
        .astype(int)
    )

    def normalizar_bool(serie: pd.Series) -> pd.Series:
        return (
            serie.astype(str).str.strip().str.lower()
            .map({"si": True, "sí": True, "no": False})
        )

    df["tiene_videobeam"]    = normalizar_bool(df["tiene_videobeam"])
    df["tiene_computadores"] = normalizar_bool(df["tiene_computadores"])
    df["es_laboratorio"]     = normalizar_bool(df["es_laboratorio"])

    nulos = df[["id", "capacidad", "tiene_videobeam",
                "tiene_computadores", "es_laboratorio"]].isnull().sum()
    if nulos.any():
        print("⚠️  ADVERTENCIA — Salones con valores nulos:")
        print(nulos[nulos > 0])

    salones = df.drop(columns=["capacidad_raw"]).to_dict(orient="records")
    print(f"✅ Salones cargados: {len(salones)}")
    return salones


def cargar_clases(ruta: str) -> list[dict]:
    """
    Carga el archivo Excel de clases, limpia los datos y
    devuelve una lista de diccionarios listos para el solver.

    Columnas esperadas:
        Programa, Materia, Grupo, Profesor, Tipo, Horario, Duración,
        requiere_videobeam, requiere_computadores, requiere_laboratorio,
        Cantidad Estudiantes
    """
    df = pd.read_excel(ruta)
    df.columns = df.columns.str.strip().str.lower()

    df = df.rename(columns={
        "programa":              "programa",
        "materia":               "materia",
        "grupo":                 "grupo",
        "profesor":              "profesor",
        "tipo":                  "tipo",
        "horario":               "horario",
        "duración":              "duracion",
        "requiere_videobeam":    "requiere_videobeam",
        "requiere_computadores": "requiere_computadores",
        "requiere_laboratorio":  "requiere_laboratorio",
        "cantidad estudiantes":  "estudiantes",
    })

    def normalizar_bool(serie: pd.Series) -> pd.Series:
        return (
            serie.astype(str).str.strip().str.lower()
            .map({"si": True, "sí": True, "no": False})
        )

    df["requiere_videobeam"]    = normalizar_bool(df["requiere_videobeam"])
    df["requiere_computadores"] = normalizar_bool(df["requiere_computadores"])
    df["requiere_laboratorio"]  = normalizar_bool(df["requiere_laboratorio"])

    df["estudiantes"] = pd.to_numeric(df["estudiantes"], errors="coerce").astype("Int64")

    # Unificar separador de horario a em dash (–)
    df["horario"] = (
        df["horario"].astype(str).str.strip()
        .str.replace("-", "–", regex=False)
    )

    df["clave"] = df["materia"] + " | " + df["grupo"]

    # Advertir duplicados
    duplicados = df[df.duplicated(subset=["clave"], keep=False)]
    if not duplicados.empty:
        print(f"⚠️  ADVERTENCIA — {len(duplicados)} filas con clave duplicada (materia + grupo):")
        print(duplicados[["clave", "profesor", "horario"]].to_string())

    nulos = df[["materia", "grupo", "profesor", "tipo",
                "horario", "estudiantes"]].isnull().sum()
    if nulos.any():
        print("⚠️  ADVERTENCIA — Clases con nulos en columnas críticas:")
        print(nulos[nulos > 0])

    clases = df.to_dict(orient="records")
    print(f"✅ Clases cargadas:  {len(clases)}")
    return clases
