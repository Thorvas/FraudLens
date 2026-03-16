import json
import pickle
import sys

from model_utils import FEATURE_COLUMNS, MODEL_PATH, build_prediction_frame_from_db

try:
    from kafka import KafkaProducer
except ImportError as exc:
    raise ImportError(
        "kafka-python is required. Install it with: pip install kafka-python"
    ) from exc


PREDICTIONS_TOPIC = "fraud-predictions"
BOOTSTRAP_SERVERS = "localhost:9092"


def describe_feature(feature: str, value: float) -> str:
    if feature == "hour_deviation":
        return f"transfer time was unusual for this user ({value:.2f})"
    if feature == "amount":
        return f"transfer amount was high ({value:.2f})"
    if feature == "beneficiary_transfer_count_for_user":
        if value == 0:
            return "beneficiary has not been used by this user before"
        return f"user had sent to this beneficiary {int(value)} times before"
    if feature == "amount_ratio_to_avg":
        return f"amount was {value:.2f}x the user's average transfer"
    if feature == "user_transaction_count":
        return f"user had only {int(value)} prior transactions"
    if feature == "time_since_last_transfer":
        return f"time since previous transfer was short ({value:.1f} minutes)"
    if feature == "transfers_last_1h":
        return f"user made {int(value)} transfers in the last hour"
    return f"{feature} contributed to the score"


def explain_prediction(model, prediction_frame) -> list[str]:
    row = prediction_frame.iloc[0]
    contributions = []

    for index, feature in enumerate(FEATURE_COLUMNS):
        value = float(row[feature])
        contribution = value * float(model.coef_[0][index])
        contributions.append((contribution, feature, value))

    top_contributions = sorted(contributions, reverse=True)[:3]

    reasons = []
    for contribution, feature, value in top_contributions:
        if contribution <= 0:
            continue
        reasons.append(describe_feature(feature, value))

    if not reasons:
        reasons.append("no strong positive risk factors were found")

    return reasons


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
    reasons = explain_prediction(model, prediction_frame)
    kafka_result = {
        "accountId": event_data["account_id"],
        "beneficiaryId": event_data["beneficiary_id"],
        "fraudChance": float(probability),
        "reasons": reasons,
    }
    send_prediction_to_kafka(kafka_result)

    print(f"\nEvent ID: {event_data['event_id']}")
    print("Prediction:", prediction_label)
    print(f"Fraud probability: {probability * 100:.1f}%")
    print("Top reasons:")
    for reason in reasons:
        print("-", reason)
    print("Sent prediction to Kafka:", kafka_result)


if __name__ == "__main__":
    main()
