"""
SmartCampusAI — Extracción de texto de PDFs
Endpoint simple: recibe PDF, devuelve texto plano.
NO usa IA. Solo extrae el contenido textual del documento.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
import io

router = APIRouter(prefix="/api/pdf", tags=["PDF"])


@router.post("/extract-text")
async def extract_text(archivo: UploadFile = File(...)):
    """
    Recibe un archivo PDF y devuelve su contenido como texto plano.
    Máximo 10MB. Solo archivos .pdf.
    """
    # Validar extensión
    if not archivo.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF (.pdf)")

    # Leer contenido
    contenido = await archivo.read()

    # Validar tamaño (máximo 10MB)
    if len(contenido) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo excede el límite de 10MB")

    # Extraer texto con PyPDF2
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(contenido))
        texto = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                texto += page_text + "\n"
    except ImportError:
        # Fallback: intentar con pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(contenido)) as pdf:
                texto = ""
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        texto += page_text + "\n"
        except ImportError:
            raise HTTPException(
                status_code=500,
                detail="No hay librería de PDF instalada. Instala PyPDF2 o pdfplumber."
            )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No se pudo leer el PDF: {str(e)}")

    texto = texto.strip()

    if not texto:
        raise HTTPException(
            status_code=422,
            detail="No se pudo extraer texto del PDF. Puede ser un PDF escaneado (imagen) sin texto seleccionable."
        )

    return {
        "texto": texto,
        "paginas": len(reader.pages) if 'reader' in dir() else 0,
        "caracteres": len(texto),
    }
