import os
from functools import lru_cache

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from ..languages import LANGUAGES

MODEL_ID = os.getenv(
    "TRANSLATION_MODEL",
    "facebook/nllb-200-distilled-600M"
)


@lru_cache(maxsize=1)
def get_translation_model():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        MODEL_ID,
        torch_dtype=dtype,
    ).to(device)

    return tokenizer, model, device


def translate_text(text: str, source: str, target: str) -> str:
    if source == target:
        return text

    tokenizer, model, device = get_translation_model()

    src_lang = LANGUAGES[source]["nllb"]
    tgt_lang = LANGUAGES[target]["nllb"]

    tokenizer.src_lang = src_lang
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    ).to(device)

    forced_bos_token_id = tokenizer.convert_tokens_to_ids(tgt_lang)

    with torch.inference_mode():
        output = model.generate(
            **inputs,
            forced_bos_token_id=forced_bos_token_id,
            max_length=512,
            num_beams=4,
        )

    return tokenizer.batch_decode(
        output,
        skip_special_tokens=True
    )[0].strip()
