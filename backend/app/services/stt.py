import os
from pathlib import Path
from functools import lru_cache

import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

from ..languages import LANGUAGES

MODEL_ID = os.getenv("WHISPER_MODEL", "openai/whisper-small")


@lru_cache(maxsize=1)
def get_stt_pipeline():
    device = 0 if torch.cuda.is_available() else -1
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        MODEL_ID,
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        use_safetensors=True,
    )

    if torch.cuda.is_available():
        model = model.to("cuda")

    processor = AutoProcessor.from_pretrained(MODEL_ID)

    return pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch_dtype,
        device=device,
    )


def transcribe_file(audio_path: Path, language_code: str) -> dict:
    recognizer = get_stt_pipeline()
    whisper_language = LANGUAGES[language_code]["whisper"]

    result = recognizer(
        str(audio_path),
        generate_kwargs={
            "language": whisper_language,
            "task": "transcribe",
        },
        return_timestamps=True,
    )

    text = result.get("text", "").strip()
    chunks = result.get("chunks", [])

    duration = None
    if chunks:
        last = chunks[-1].get("timestamp")
        if isinstance(last, (tuple, list)) and last[-1] is not None:
            duration = float(last[-1])

    return {
        "text": text,
        "duration": duration,
    }
