import json
import logging
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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fraudlens.db"
EVENT_UPLOAD_TOPIC = "event-upload"
DEFAULT_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "kafka:9092",
)


def save_event_to_db(event: dict, db_path: Path = DB_PATH) -> int:
    payload = dict(event["payload"])
    if "beneficiaryID" in payload and "beneficiaryId" not in payload:
        payload["beneficiaryId"] = payload.pop("beneficiaryID")
    payload["isFraud"] = bool(event["isFraud"])
    account_id = int(event["accountId"])

    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT OR IGNORE INTO user (id, name, surname)
            VALUES (?, '', '')
            """,
            (account_id,),
        )
        cursor = conn.execute(
            """
            INSERT INTO event (user_id, occurred_at, payload)
            VALUES (?, ?, ?)
            """,
            (
                account_id,
                event["occurredAt"],
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)
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
            auto_offset_reset="earliest",
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
        )
    except NoBrokersAvailable as exc:
        raise RuntimeError(
            "Kafka broker is not reachable. "
            "If running on the host, start Kafka and use localhost:9092. "
            "If running in Docker, use kafka:29092 or set KAFKA_BOOTSTRAP_SERVERS."
        ) from exc

    logger.info(
        "Listening for topic '%s' on %s with consumer group '%s'...",
        topic,
        bootstrap_servers,
        group_id,
    )

    for message in consumer:
        try:
            event_id = save_event_to_db(message.value)
            logger.info("Saved event %s to %s", event_id, DB_PATH)
        except Exception as exc:
            logger.exception("Failed to save event from Kafka: %s", exc)


def main() -> None:
    topic = sys.argv[1] if len(sys.argv) > 1 else EVENT_UPLOAD_TOPIC
    bootstrap_servers = (
        sys.argv[2] if len(sys.argv) > 2 else DEFAULT_BOOTSTRAP_SERVERS
    )
    consume_kafka(topic=topic, bootstrap_servers=bootstrap_servers)


if __name__ == "__main__":
    main()
