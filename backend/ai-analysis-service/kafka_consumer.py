import json
import sqlite3
import sys
from pathlib import Path

try:
    from kafka import KafkaConsumer
except ImportError as exc:
    raise ImportError(
        "kafka-python is required. Install it with: pip install kafka-python"
    ) from exc


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fraudlens.db"


def save_event_to_db(event: dict, db_path: Path = DB_PATH) -> None:
    payload = dict(event["payload"])
    payload["isFraud"] = bool(event["isFraud"])

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO event (id, user_id, occurred_at, payload)
            VALUES (?, ?, ?, ?)
            """,
            (
                int(event["eventId"]),
                int(event["accountId"]),
                event["occurredAt"],
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def consume_kafka(
    topic: str,
    bootstrap_servers: str = "localhost:9092",
    group_id: str = "fraudlens-ai-analysis",
) -> None:
    consumer = KafkaConsumer(
        "event-upload",
        bootstrap_servers=bootstrap_servers,
        group_id=group_id,
        auto_offset_reset="latest",
        value_deserializer=lambda value: json.loads(value.decode("utf-8")),
    )

    for message in consumer:
        save_event_to_db(message.value)
        print(f"Saved event {message.value['eventId']} to {DB_PATH}")


def main() -> None:
    topic = sys.argv[1] if len(sys.argv) > 1 else "fraud-events"
    bootstrap_servers = sys.argv[2] if len(sys.argv) > 2 else "localhost:9092"
    consume_kafka(topic=topic, bootstrap_servers=bootstrap_servers)


if __name__ == "__main__":
    main()
