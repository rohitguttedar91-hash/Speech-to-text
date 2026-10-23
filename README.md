# Indian Language Speech-to-Text & Translation AI (Bhasha Voice AI)

An AI-powered web application for speech recognition and translation across 12 Indian languages and English. Powered by OpenAI Whisper for automatic speech recognition (ASR) and Meta NLLB-200 for neural machine translation.

---

## 📁 Project Structure

```text
Speech-to-text/
├── .vscode/                     # VS Code debug and editor configurations
│   ├── launch.json              # Debug launchers for FastAPI & Vite
│   └── settings.json            # Python interpreter & environment settings
├── backend/                     # FastAPI backend service
│   ├── .env                     # Environment variables (CORS, models, upload limits)
│   ├── .env.example             # Example environment configuration
│   ├── .gitignore               # Backend ignore rules
│   ├── requirements.txt         # Python dependencies
│   ├── uploads/                 # Temporary audio upload processing folder
│   └── app/                     # Application source code
│       ├── __init__.py
│       ├── main.py              # FastAPI endpoints, CORS, upload handling
│       ├── languages.py         # Supported language definitions and model codes
│       ├── history.db           # SQLite database storing transcription history
│       └── services/            # Core business logic services
│           ├── __init__.py
│           ├── audio.py         # Audio normalization and FFmpeg conversion
│           ├── database.py      # SQLite CRUD operations for history
│           ├── stt.py           # Whisper ASR pipeline & inference
│           └── translation.py   # NLLB-200 seq2seq translation inference
├── frontend/                    # Vite + React frontend client
│   ├── index.html               # Main HTML entry point
│   ├── package.json             # NPM dependencies & scripts
│   ├── postcss.config.js        # PostCSS configuration
│   ├── tailwind.config.js       # Tailwind CSS theme configuration
│   ├── vite.config.js           # Vite dev server & /api proxy setup
│   └── src/                     # React application source code
│       ├── App.jsx              # Main UI component (record, upload, result, history)
│       ├── index.css            # Styles & Tailwind utilities
│       └── main.jsx             # React DOM entry point
├── run_all.bat                  # One-click launcher to run both backend & frontend
├── run_backend.bat              # Script to run FastAPI backend on port 8000
├── run_frontend.bat             # Script to run Vite frontend on port 5173
├── .gitignore                   # Root repository gitignore
└── README.md                    # Project documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Python 3.10+** (tested on 3.14)
- **Node.js 18+** & **npm**
- **FFmpeg** installed and accessible in your system `PATH` (used to convert audio into 16kHz mono WAV format)

### 2. One-Click Launch (Windows)
Double-click:
```cmd
run_all.bat
```
This opens the backend on port `8000`, the frontend on port `5173`, and opens `http://localhost:5173` in your default browser.

### 3. Or Run Manually

#### Backend:
```bash
cd backend
# Activate virtual environment
.venv\Scripts\activate

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

#### Frontend:
```bash
cd frontend
# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```
Web App UI: `http://localhost:5173`

---

## 🌐 Supported Languages

| Code | Language | Native Name | Whisper Code | NLLB-200 Code |
| :--- | :--- | :--- | :--- | :--- |
| `hi` | Hindi | हिन्दी | `hi` | `hin_Deva` |
| `kn` | Kannada | ಕನ್ನಡ | `kn` | `kan_Knda` |
| `te` | Telugu | తెలుగు | `te` | `tel_Telu` |
| `ta` | Tamil | தமிழ் | `ta` | `tam_Taml` |
| `ml` | Malayalam | മലയാളം | `ml` | `mal_Mlym` |
| `mr` | Marathi | मराठी | `mr` | `mar_Deva` |
| `bn` | Bengali | বাংলা | `bn` | `ben_Beng` |
| `gu` | Gujarati | ગુજરાતી | `gu` | `guj_Gujr` |
| `pa` | Punjabi | ਪੰਜਾਬੀ | `pa` | `pan_Guru` |
| `or` | Odia | ଓଡ଼ିଆ | `or` | `ory_Orya` |
| `as` | Assamese | অসমীয়া | `as` | `asm_Beng` |
| `en` | English | English | `en` | `eng_Latn` |

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check endpoint |
| `GET` | `/api/languages` | Returns list of supported languages and metadata |
| `POST` | `/api/transcribe` | Transcribes an audio file (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.flac`) and optionally translates it |
| `POST` | `/api/translate` | Translates raw text from source language to target language |
| `GET` | `/api/history` | Fetches the latest 100 transcription history records |
| `DELETE` | `/api/history` | Clears all transcription records from SQLite database |

---

## 🧠 Models Used
- **Speech-to-Text**: `openai/whisper-small` (cached locally via Hugging Face Hub)
- **Translation**: `facebook/nllb-200-distilled-600M` (cached locally via Hugging Face Hub)
