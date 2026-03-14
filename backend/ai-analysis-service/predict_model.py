import json
import pickle
import sys

from model_utils import MODEL_PATH, build_prediction_frame_from_db

try:
    from kafka import KafkaProducer
except ImportError as exc:
    raise ImportError(
        "kafka-python is required. Install it with: pip install kafka-python"
    ) from exc


PREDICTIONS_TOPIC = "fraud-predictions"
BOOTSTRAP_SERVERS = "localhost:9092"


def send_prediction_to_kafka(result: dict) -> None:
    producer = KafkaProducer(
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_serializer=lambda value: json.dumps(value).encode("utf-8"),
    )
    try:
        producer.send(PREDICTIONS_TOPIC, value=result).get(timeout=10)
        producer.flush()
    finally:
        producer.close()


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}. Run train_model.py first."
        )

    with open(MODEL_PATH, "rb") as model_file:
        model = pickle.load(model_file)

    event_id = int(sys.argv[1]) if len(sys.argv) > 1 else None
    prediction_frame, event_data = build_prediction_frame_from_db(
        event_id=event_id
    )

    prediction = model.predict(prediction_frame)[0]
    probability = model.predict_proba(prediction_frame)[0][1]
    prediction_label = "fraud" if prediction == 1 else "not fraud"
    kafka_result = {
        "accountId": event_data["account_id"],
        "beneficiaryId": event_data["beneficiary_id"],
        "fraudChance": float(probability),
    }
    send_prediction_to_kafka(kafka_result)

    print(f"\nEvent ID: {event_data['event_id']}")
    print("Prediction:", prediction_label)
    print(f"Fraud probability: {probability * 100:.1f}%")
    print("Sent prediction to Kafka:", kafka_result)


if __name__ == "__main__":
    main()
