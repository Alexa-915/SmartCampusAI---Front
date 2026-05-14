"""
SmartCampus AI Agent — Router principal
Analiza el dataset con lógica determinista + IA y devuelve
score, conflictos, y recomendaciones en lenguaje natural.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.dataset import Dataset
from app.auth import get_usuario_actual
from app.models.usuario import Usuario
from app.services.analysis_engine import analizar_dataset
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/api/agent", tags=["agente IA"])

# Inicialización lazy del cliente Anthropic (no crashea si falta la key)
_anthropic_client = None

def _get_client():
    """Obtiene el cliente de Anthropic. Retorna None si no hay API key o librería."""
    global _anthropic_client
    if _anthropic_client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key:
            try:
                import anthropic
                _anthropic_client = anthropic.Anthropic(api_key=api_key)
            except (ImportError, Exception):
                pass
    return _anthropic_client


# ── Endpoint principal: análisis completo ─────────────────────────────────

@router.post("/analizar/{dataset_id}")
def analizar(
    dataset_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    # 1. Análisis determinista (Python puro, rápido)
    metricas = analizar_dataset(dataset_id, db)

    if "error" in metricas:
        raise HTTPException(status_code=400, detail=metricas["error"])

    # 2. Llamada a Claude para recomendaciones en lenguaje natural
    recomendaciones = _generar_recomendaciones(metricas, dataset.nombre)

    return {
        "dataset_id":   dataset_id,
        "nombre":       dataset.nombre,
        "metricas":     metricas,
        "recomendaciones": recomendaciones,
    }


# ── Endpoint de chat con el agente ────────────────────────────────────────

class ChatRequest(BaseModel):
    pregunta: str
    dataset_id: int
    historial: list = []   # mensajes previos [{role, content}]


@router.post("/chat")
def chat(
    datos: ChatRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_usuario_actual),
):
    dataset = db.query(Dataset).filter(
        Dataset.id == datos.dataset_id,
        Dataset.usuario_id == usuario.id,
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset no encontrado")

    metricas = analizar_dataset(datos.dataset_id, db)

    contexto_sistema = f"""Eres el SmartCampus AI Agent, un asistente académico experto
en análisis de horarios universitarios. Tienes acceso al análisis del dataset
"{dataset.nombre}" con los siguientes datos:

{json.dumps(metricas, ensure_ascii=False, indent=2)}

Responde en español, de forma concisa y útil. Si detectas problemas, da
recomendaciones concretas y accionables. Máximo 3 párrafos por respuesta."""

    mensajes = datos.historial + [{"role": "user", "content": datos.pregunta}]

    try:
        client = _get_client()
        if not client:
            # Fallback sin IA: responder con análisis determinista
            return _respuesta_sin_ia(metricas, datos.pregunta, mensajes)

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            system=contexto_sistema,
            messages=mensajes,
        )
        respuesta = response.content[0].text
    except HTTPException:
        raise
    except Exception as e:
        # Log del error real para debug
        print(f"[Agent Chat Error] {type(e).__name__}: {e}")
        # Fallback: responder sin IA si Claude falla
        return _respuesta_sin_ia(metricas, datos.pregunta, mensajes)

    return {
        "respuesta": respuesta,
        "historial": mensajes + [{"role": "assistant", "content": respuesta}],
    }


def _respuesta_sin_ia(metricas: dict, pregunta: str, mensajes: list) -> dict:
    """
    Genera una respuesta basada en análisis determinista.
    Fallback cuando Anthropic no está disponible.
    """
    score = metricas.get("score", 0)
    total_clases = metricas.get("total_clases", 0)
    total_salones = metricas.get("total_salones", 0)
    sin_salon = metricas.get("clases_sin_salon", [])
    carga_imp = metricas.get("carga_imposible", [])
    insuf = metricas.get("insuficiencia_recursos", [])
    nivel = metricas.get("mensaje_nivel", "")

    respuesta = f"Análisis de viabilidad: {total_clases} clases, {total_salones} salones. Score: {score}/100."

    if nivel:
        respuesta += f" {nivel}"

    if sin_salon:
        respuesta += f" {len(sin_salon)} clases no tienen salón compatible por capacidad o equipamiento."
    if carga_imp:
        respuesta += f" {len(carga_imp)} profesores exceden la carga máxima posible en su franja horaria."
    if insuf:
        recursos = ", ".join(i["recurso"] for i in insuf)
        respuesta += f" Insuficiencia detectada en: {recursos}."

    return {
        "respuesta": respuesta,
        "historial": mensajes + [{"role": "assistant", "content": respuesta}],
    }


# ── Helper interno ─────────────────────────────────────────────────────────

def _generar_recomendaciones(metricas: dict, nombre_dataset: str) -> list[dict]:
    prompt = f"""Eres un experto en planeación académica universitaria.
Analiza estas métricas del dataset "{nombre_dataset}" y genera recomendaciones.

MÉTRICAS:
{json.dumps(metricas, ensure_ascii=False, indent=2)}

Responde SOLO con un JSON válido con esta estructura exacta, sin texto adicional:
{{
  "resumen": "Una frase describiendo el estado general del dataset",
  "recomendaciones": [
    {{
      "tipo": "critico|advertencia|info",
      "titulo": "Título corto de la recomendación",
      "descripcion": "Explicación detallada y acción concreta a tomar"
    }}
  ]
}}

Genera entre 2 y 5 recomendaciones ordenadas de mayor a menor urgencia."""

    try:
        client = _get_client()
        if not client:
            raise Exception("No API key")
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        texto = response.content[0].text.strip()
        # Limpiar posibles bloques markdown
        if "```" in texto:
            import re
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', texto)
            if match:
                texto = match.group(1).strip()
        data = json.loads(texto)
        return data
    except Exception:
        # Fallback: recomendaciones generadas sin IA si falla
        recs = []
        if metricas["clases_imposibles"]:
            recs.append({
                "tipo": "critico",
                "titulo": f"{len(metricas['clases_imposibles'])} clases sin solución posible",
                "descripcion": "Hay clases que no podrán asignarse a ningún salón. Revisa capacidades y recursos."
            })
        if metricas["conflictos_profesores"]:
            recs.append({
                "tipo": "advertencia",
                "titulo": "Conflictos de profesor detectados",
                "descripcion": "Algunos profesores tienen más de 5 clases en la misma franja horaria."
            })
        return {"resumen": "Análisis completado con advertencias.", "recomendaciones": recs}