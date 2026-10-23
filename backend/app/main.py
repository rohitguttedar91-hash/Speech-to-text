import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse

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


@app.get("/")
def root(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return HTMLResponse("""
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Indian Language Speech-to-Text API</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; max-width: 540px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
            .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
            h1 { font-size: 26px; font-weight: 800; margin: 0 0 10px; color: #f8fafc; letter-spacing: -0.5px; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 28px; }
            .btn { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 12px 0; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px; text-decoration: none; transition: all 0.2s ease; }
            .btn-primary { background: #2563eb; color: #ffffff; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4); }
            .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
            .btn-secondary { background: #334155; color: #f1f5f9; border: 1px solid #475569; }
            .btn-secondary:hover { background: #475569; transform: translateY(-1px); }
            .endpoints { margin-top: 24px; padding-top: 20px; border-top: 1px solid #334155; font-size: 13px; color: #64748b; text-align: left; }
            .endpoints strong { color: #94a3b8; display: block; margin-bottom: 6px; }
            code { background: #0f172a; padding: 3px 6px; border-radius: 4px; font-size: 12px; color: #38bdf8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge"><span class="badge-dot"></span> Backend API Running</div>
            <h1>Indian Speech-to-Text API</h1>
            <p>The FastAPI backend server is active on port 8000. Choose an option below to proceed:</p>
            <a href="http://localhost:5173" class="btn btn-primary">Open Web Application UI (localhost:5173) &rarr;</a>
            <a href="/docs" class="btn btn-secondary">Interactive Swagger API Docs (/docs)</a>
            <div class="endpoints">
              <strong>Core Endpoints:</strong>
              <div><code>GET /api/health</code> &bull; <code>GET /api/languages</code> &bull; <code>POST /api/transcribe</code> &bull; <code>POST /api/translate</code></div>
            </div>
          </div>
        </body>
        </html>
        """)
    return {
        "status": "online",
        "service": "Indian Language Speech-to-Text API",
        "frontend_url": "http://localhost:5173",
        "docs_url": "/docs",
        "endpoints": {
            "health": "/api/health",
            "languages": "/api/languages",
            "transcribe": "/api/transcribe",
            "translate": "/api/translate",
            "history": "/api/history"
        }
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
