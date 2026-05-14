"""
SmartCampusAI — Generador de datasets con IA (OpenRouter)
Endpoint para generar clases universitarias a partir de texto natural.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/ia", tags=["IA Dataset"])

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Esquema base que toda clase debe seguir
ESQUEMA_BASE = {
    "materia": "",
    "grupo": "",
    "profesor": "",
    "tipo_profesor": "",
    "horario": "",
    "estudiantes": 0,
    "requiere_videobeam": False,
    "requiere_computadores": False,
    "requiere_laboratorio": False,
}


class PromptRequest(BaseModel):
    prompt: str


def validar_clase(clase: dict) -> dict:
    """Normaliza una clase para que siga el esquema exacto."""
    nueva = ESQUEMA_BASE.copy()
    for key in nueva:
        if key in clase:
            nueva[key] = clase[key]
    # Asegurar tipos correctos
    nueva["estudiantes"] = int(nueva["estudiantes"]) if nueva["estudiantes"] else 0
    nueva["requiere_videobeam"] = bool(nueva["requiere_videobeam"])
    nueva["requiere_computadores"] = bool(nueva["requiere_computadores"])
    nueva["requiere_laboratorio"] = bool(nueva["requiere_laboratorio"])
    return nueva


def limpiar_json(texto: str) -> str:
    """Extrae JSON limpio de la respuesta de la IA."""
    texto = texto.strip()

    # Quitar bloques markdown
    if "```" in texto:
        match = re.search(r'```(?:json)?\s*([\s\S]*?)```', texto)
        if match:
            texto = match.group(1).strip()

    # Buscar el primer { y el último }
    idx_inicio = texto.find('{')
    idx_fin = texto.rfind('}')
    if idx_inicio >= 0 and idx_fin > idx_inicio:
        texto = texto[idx_inicio:idx_fin + 1]

    return texto


@router.post("/generar-clases")
def generar_clases(data: PromptRequest):
    """
    Genera un dataset de clases universitarias usando IA.
    Recibe un prompt en lenguaje natural y devuelve JSON estructurado.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY no configurada en el archivo .env"
        )

    if not data.prompt.strip():
        raise HTTPException(status_code=400, detail="El prompt no puede estar vacío")

    prompt_sistema = f"""Eres un extractor de información académica. Tu trabajo es convertir texto del usuario en JSON estructurado.

REGLA FUNDAMENTAL: SOLO usa información que el usuario ESCRIBIÓ EXPLÍCITAMENTE. NUNCA inventes datos.

Esquema de respuesta (SOLO JSON, nada más):
{{"clases": [{json.dumps(ESQUEMA_BASE)}]}}

INSTRUCCIONES ESTRICTAS:
1. Si el usuario NO mencionó profesor → "profesor": ""
2. Si el usuario NO mencionó horario → "horario": ""
3. Si el usuario NO mencionó tipo de profesor → "tipo_profesor": ""
4. Si el usuario NO mencionó estudiantes → "estudiantes": 0
5. Si el usuario NO mencionó videobeam/computadores/laboratorio → false
6. Si el usuario NO especificó cantidad de grupos → generar SOLO 1 clase
7. Si el usuario dice "hola" o algo sin información académica → responder: {{"clases": []}}
8. grupo siempre es "Grupo 1", "Grupo 2", etc.
9. horario si se menciona debe ser formato "H:MM–H:MM"
10. NUNCA inventes nombres de profesores, horarios, ni cantidades

EJEMPLO:
Usuario: "Genera clases de cálculo con 30 estudiantes"
Respuesta: {{"clases": [{{"materia": "Cálculo", "grupo": "Grupo 1", "profesor": "", "tipo_profesor": "", "horario": "", "estudiantes": 30, "requiere_videobeam": false, "requiere_computadores": false, "requiere_laboratorio": false}}]}}

Solicitud del usuario:
{data.prompt}"""

    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "openai/gpt-oss-20b:free",
                "messages": [
                    {"role": "user", "content": prompt_sistema}
                ],
                "temperature": 0.2,
                "max_tokens": 4096,
            },
            timeout=30,
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error de OpenRouter: {response.text[:200]}"
            )

        resultado = response.json()

        if "error" in resultado:
            raise HTTPException(
                status_code=500,
                detail=f"Error del modelo: {resultado['error']}"
            )

        # Extraer contenido de la respuesta
        contenido = resultado["choices"][0]["message"]["content"]

        # Limpiar y parsear JSON
        contenido_limpio = limpiar_json(contenido)

        try:
            data_json = json.loads(contenido_limpio)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=422,
                detail=f"La IA no devolvió JSON válido. Error: {str(e)}. Respuesta: {contenido_limpio[:300]}"
            )

        # Extraer y validar clases
        clases = data_json.get("clases", [])
        if not isinstance(clases, list):
            clases = [data_json] if "materia" in data_json else []

        clases_limpias = [validar_clase(c) for c in clases]

        return {
            "clases": clases_limpias,
            "total": len(clases_limpias),
        }

    except HTTPException:
        raise
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Timeout: la IA tardó demasiado en responder")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="No se pudo conectar con OpenRouter")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")
