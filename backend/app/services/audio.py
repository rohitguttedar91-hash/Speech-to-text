import asyncio
import subprocess
import uuid
from pathlib import Path


async def save_and_normalize_audio(
    raw: bytes,
    suffix: str,
    upload_dir: Path
) -> Path:
    source = upload_dir / f"{uuid.uuid4().hex}{suffix}"
    output = upload_dir / f"{uuid.uuid4().hex}.wav"

    source.write_bytes(raw)

    def convert():
        command = [
            "ffmpeg",
            "-y",
            "-i", str(source),
            "-ac", "1",
            "-ar", "16000",
            "-sample_fmt", "s16",
            str(output),
        ]
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                "FFmpeg could not process the audio. "
                f"{completed.stderr[-1000:]}"
            )

    try:
        await asyncio.to_thread(convert)
    finally:
        source.unlink(missing_ok=True)

    return output
