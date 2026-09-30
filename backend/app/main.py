import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .languages import LANGUAGES
from .services.audio import save_and_normalize_audio
from .services.database import clear_history, get_history, save_history
from .services.stt import transcribe_file
from .services.translation import translate_text

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

origins = [x.strip() for x in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if x.strip()]

app = FastAPI(
    title="Indian Language Speech-to-Text API",
    version="1.0.0",
    description="Speech recognition and translation API for Indian languages."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {
    ".wav", ".mp3", ".m4a", ".ogg", ".webm", ".flac", ".aac", ".mp4"
}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "indian-speech-to-text"}


@app.get("/api/languages")
def languages():
    return {"languages": LANGUAGES}


@app.post("/api/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(...),
    translate_to: Optional[str] = Form(None),
):
    if language not in LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported speech language.")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {suffix or 'unknown'}"
        )

    max_mb = int(os.getenv("MAX_UPLOAD_MB", "100"))
    raw = await file.read()
    if len(raw) > max_mb * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File is larger than {max_mb} MB."
        )

    try:
        normalized = await save_and_normalize_audio(
            raw, suffix, UPLOAD_DIR
        )
        result = transcribe_file(normalized, language)

        translated_text = None
        if translate_to:
            if translate_to not in LANGUAGES:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported translation language."
                )
            if translate_to != language:
                translated_text = translate_text(
                    result["text"], language, translate_to
                )
            else:
                translated_text = result["text"]

        item = {
            "filename": file.filename,
            "language": language,
            "language_name": LANGUAGES[language]["name"],
            "text": result["text"],
            "duration": result.get("duration"),
            "translation_language": translate_to,
            "translated_text": translated_text,
        }
        save_history(item)

        return JSONResponse({
            "success": True,
            **item,
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {exc}"
        )
    finally:
        try:
            normalized.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/api/translate")
def translate(
    text: str = Form(...),
    source_language: str = Form(...),
    target_language: str = Form(...),
):
    if source_language not in LANGUAGES or target_language not in LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language.")
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is empty.")

    try:
        translated = translate_text(text, source_language, target_language)
        return {
            "success": True,
            "source_language": source_language,
            "target_language": target_language,
            "translated_text": translated,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/history")
def history():
    return {"items": get_history()}


@app.delete("/api/history")
def delete_history():
    clear_history()
    return {"success": True}
