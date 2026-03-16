"""
SQLite database schema and population for the fraud detection dataset.
"""
import json
import sqlite3
from pathlib import Path


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    surname TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    occurred_at TEXT NOT NULL,
    payload TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE INDEX IF NOT EXISTS idx_event_user_id ON event(user_id);
CREATE INDEX IF NOT EXISTS idx_event_occurred_at ON event(occurred_at);
"""


def get_connection(db_path: str | Path) -> sqlite3.Connection:
    """Return a connection to the SQLite database."""
    return sqlite3.connect(db_path)


def init_schema(conn: sqlite3.Connection) -> None:
    """Create the user and event tables if they do not exist."""
    conn.executescript(SCHEMA_SQL)
    conn.commit()


def load_from_jsonl(conn: sqlite3.Connection, jsonl_path: str | Path) -> None:
    """
    Populate the database from a JSONL file.
    Each line is a transfer event with: eventId, occurredAt, accountId, payload, isFraud.
    Users are derived from unique accountIds (name/surname not in source data, left empty).
    """
    jsonl_path = Path(jsonl_path)
    if not jsonl_path.exists():
        raise FileNotFoundError(f"Dataset not found: {jsonl_path}")

    users_seen: set[int] = set()
    events: list[tuple[int, int, str, str]] = []

    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            event_id = row["eventId"]
            account_id = int(row["accountId"])
            occurred_at = row["occurredAt"]
            payload_obj = {**row.get("payload", {}), "isFraud": row.get("isFraud", False)}
            payload_str = json.dumps(payload_obj, ensure_ascii=False)

            users_seen.add(account_id)
            events.append((event_id, account_id, occurred_at, payload_str))

    # Insert users (id = accountId; name/surname not in dataset, use placeholders)
    user_rows = [(uid, "", "") for uid in sorted(users_seen)]
    conn.executemany(
        "INSERT OR IGNORE INTO user (id, name, surname) VALUES (?, ?, ?)",
        user_rows,
    )

    # Insert events
    conn.executemany(
        "INSERT OR REPLACE INTO event (id, user_id, occurred_at, payload) VALUES (?, ?, ?, ?)",
        events,
    )
    conn.commit()


def create_and_load(db_path: str | Path = "fraudlens.db", jsonl_path: str | Path = "transfer_fraud_dataset.jsonl") -> None:
    """
    Create the database schema and load data from the JSONL dataset.
    Default paths are relative to the current working directory.
    """
    db_path = Path(db_path)
    conn = get_connection(db_path)
    try:
        init_schema(conn)
        load_from_jsonl(conn, jsonl_path)
    finally:
        conn.close()
