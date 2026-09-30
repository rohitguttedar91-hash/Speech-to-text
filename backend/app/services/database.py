import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "history.db"


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transcriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                filename TEXT,
                language TEXT NOT NULL,
                language_name TEXT NOT NULL,
                text TEXT NOT NULL,
                duration REAL,
                translation_language TEXT,
                translated_text TEXT
            )
        """)
        conn.commit()


_init()


def save_history(item: dict):
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO transcriptions
            (created_at, filename, language, language_name, text,
             duration, translation_language, translated_text)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                item.get("filename"),
                item["language"],
                item["language_name"],
                item["text"],
                item.get("duration"),
                item.get("translation_language"),
                item.get("translated_text"),
            ),
        )
        conn.commit()


def get_history():
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM transcriptions
            ORDER BY id DESC
            LIMIT 100
            """
        ).fetchall()
        return [dict(row) for row in rows]


def clear_history():
    with _connect() as conn:
        conn.execute("DELETE FROM transcriptions")
        conn.commit()
