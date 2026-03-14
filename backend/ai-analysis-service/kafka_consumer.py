import json
import os
import sqlite3
import sys
from pathlib import Path

try:
    from kafka import KafkaConsumer
    from kafka.errors import NoBrokersAvailable
except ImportError as exc:
    raise ImportError(
        "kafka-python is required. Install it with: pip install kafka-python"
    ) from exc


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fraudlens.db"
EVENT_UPLOAD_TOPIC = "event-upload"
DEFAULT_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092,kafka:9092",
)


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
    bootstrap_servers: str = DEFAULT_BOOTSTRAP_SERVERS,
    group_id: str = "fraudlens-ai-analysis",
) -> None:
    try:
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=[server.strip() for server in bootstrap_servers.split(",")],
            group_id=group_id,
            auto_offset_reset="latest",
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
        )
    except NoBrokersAvailable as exc:
        raise RuntimeError(
            "Kafka broker is not reachable. "
            "If running on the host, start Kafka and use localhost:9092. "
            "If running in Docker, use kafka:29092 or set KAFKA_BOOTSTRAP_SERVERS."
        ) from exc

    print(
        f"Listening for topic '{topic}' on {bootstrap_servers} "
        f"with consumer group '{group_id}'..."
    )

    for message in consumer:
        save_event_to_db(message.value)
        print(f"Saved event {message.value['eventId']} to {DB_PATH}")


def main() -> None:
    topic = sys.argv[1] if len(sys.argv) > 1 else EVENT_UPLOAD_TOPIC
    bootstrap_servers = (
        sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BOOTSTRAP_SERVERS
    )
    consume_kafka(topic=topic, bootstrap_servers=bootstrap_servers)


if __name__ == "__main__":
    main()
