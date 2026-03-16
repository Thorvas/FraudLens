import pickle
import random
import sqlite3
import sys

from model_utils import (
    DB_PATH,
    FEATURE_COLUMNS,
    MODEL_PATH,
    build_prediction_frame,
    build_prediction_frame_from_db,
)


def load_actual_label(event_id: int, db_path=DB_PATH) -> tuple[int, dict]:
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute(
            """
            SELECT
                e.user_id,
                CAST(json_extract(e.payload, '$.beneficiaryId') AS INTEGER),
                CAST(json_extract(e.payload, '$.amount') AS REAL),
                CAST(json_extract(e.payload, '$.isFraud') AS INTEGER)
            FROM event e
            WHERE e.id = ?
            """,
            (event_id,),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        raise ValueError(f"Event {event_id} not found in the database.")

    account_id, beneficiary_id, amount, is_fraud = row
    return int(is_fraud or 0), {
        "account_id": int(account_id),
        "beneficiary_id": int(beneficiary_id) if beneficiary_id is not None else None,
        "amount": float(amount),
    }


def prompt_int(prompt: str) -> int:
    raw_value = input(prompt).strip()
    if not raw_value:
        raise SystemExit("A value is required.")

    try:
        return int(raw_value)
    except ValueError as exc:
        raise SystemExit("Value must be an integer.") from exc


def prompt_float(prompt: str) -> float:
    raw_value = input(prompt).strip()
    if not raw_value:
        raise SystemExit("A value is required.")

    try:
        return float(raw_value)
    except ValueError as exc:
        raise SystemExit("Value must be a number.") from exc


def read_event_id_from_input() -> int:
    if len(sys.argv) == 2:
        return int(sys.argv[1])

    return prompt_int("Enter event ID: ")


def choose_random_event_id(db_path=DB_PATH) -> int:
    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute("SELECT id FROM event").fetchall()
    finally:
        conn.close()

    if not rows:
        raise ValueError("No events found in the database.")

    return int(random.choice(rows)[0])


def prompt_manual_prediction_frame():
    print("Enter feature values for the model:")
    prediction_frame = build_prediction_frame(
        hour_of_transfer=prompt_int("Hour of transfer (0-23): "),
        user_usual_hour=prompt_int("User usual transfer hour (0-23): "),
        amount=prompt_float("Amount: "),
        beneficiary_transfer_count_for_user=prompt_int(
            "Previous transfers to this beneficiary by this user: "
        ),
        avg_user_transfer=prompt_float("Average user transfer amount: "),
        user_transaction_count=prompt_int("Previous user transaction count: "),
        time_since_last_transfer=prompt_float("Minutes since last transfer: "),
        transfers_last_1h=prompt_int("Transfers in the last 1 hour: "),
        beneficiary_transfers_last_1h=prompt_int(
            "Transfers to this beneficiary in the last 1 hour: "
        ),
    )
    return prediction_frame, {
        "mode": "manual",
    }


def choose_mode() -> str:
    print("Choose prediction mode:")
    print("1. Predict for a specific event ID")
    print("2. Predict for a random event from the database")
    print("3. Enter model inputs manually")

    choice = input("Select option (1/2/3): ").strip()
    if choice not in {"1", "2", "3"}:
        raise SystemExit("Invalid option. Choose 1, 2, or 3.")
    return choice


def print_prediction_summary(
    *,
    prediction: int,
    probability: float,
    event_id: int | None = None,
    event_data: dict | None = None,
    actual_label: int | None = None,
) -> None:
    predicted_label = "fraud" if prediction == 1 else "not fraud"

    if event_id is not None:
        print(f"Event ID: {event_id}")

    if event_data is not None:
        if "account_id" in event_data:
            print(f"Account ID: {event_data['account_id']}")
        if "beneficiary_id" in event_data:
            print(f"Beneficiary ID: {event_data['beneficiary_id']}")
        if "amount" in event_data:
            print(f"Amount: {event_data['amount']:.2f}")

    print(f"Predicted: {predicted_label}")
    print(f"Fraud probability: {probability * 100:.1f}%")

    if actual_label is not None:
        actual_label_text = "fraud" if actual_label == 1 else "not fraud"
        was_accurate = prediction == actual_label
        print(f"Actual label: {actual_label_text}")
        print(f"Accurate: {'yes' if was_accurate else 'no'}")
    else:
        print("Actual label: unavailable for manual input")


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}. Run train_model.py first."
        )

    with open(MODEL_PATH, "rb") as model_file:
        model = pickle.load(model_file)

    missing_features = set(model.feature_names_in_) - set(FEATURE_COLUMNS)
    if missing_features:
        raise ValueError(
            f"Model expects unsupported features: {sorted(missing_features)}"
        )

    choice = choose_mode()

    if choice == "1":
        event_id = read_event_id_from_input()
        prediction_frame, event_data = build_prediction_frame_from_db(event_id=event_id)
        actual_label, actual_event_data = load_actual_label(event_id)
        prediction = int(model.predict(prediction_frame)[0])
        probability = float(model.predict_proba(prediction_frame)[0][1])
        print_prediction_summary(
            prediction=prediction,
            probability=probability,
            event_id=event_id,
            event_data={**event_data, **actual_event_data},
            actual_label=actual_label,
        )
        return

    if choice == "2":
        event_id = choose_random_event_id()
        prediction_frame, event_data = build_prediction_frame_from_db(event_id=event_id)
        actual_label, actual_event_data = load_actual_label(event_id)
        prediction = int(model.predict(prediction_frame)[0])
        probability = float(model.predict_proba(prediction_frame)[0][1])
        print_prediction_summary(
            prediction=prediction,
            probability=probability,
            event_id=event_id,
            event_data={**event_data, **actual_event_data},
            actual_label=actual_label,
        )
        return

    prediction_frame, _ = prompt_manual_prediction_frame()
    prediction = int(model.predict(prediction_frame)[0])
    probability = float(model.predict_proba(prediction_frame)[0][1])
    print("-------------------------------------------")
    print("Manual input summary:")
    for feature_name in model.feature_names_in_:
        print(f"{feature_name}: {float(prediction_frame.iloc[0][feature_name]):.4f}")
    print_prediction_summary(prediction=prediction, probability=probability)


if __name__ == "__main__":
    main()
