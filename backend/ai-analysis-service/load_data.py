#!/usr/bin/env python3
"""
Load transfer_fraud_dataset.jsonl into the SQLite database.
Run from the project root: python load_data.py
"""
from pathlib import Path

from db import create_and_load


def main() -> None:
    base = Path(__file__).resolve().parent
    db_path = base / "fraudlens.db"
    jsonl_path = base / "transfer_fraud_dataset.jsonl"
    create_and_load(db_path=db_path, jsonl_path=jsonl_path)
    print(f"Database created at {db_path}")
    print(f"Loaded data from {jsonl_path}")


if __name__ == "__main__":
    main()
