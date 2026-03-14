import pickle

from model_utils import MODEL_PATH, build_prediction_frame


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}. Run train_model.py first."
        )

    with open(MODEL_PATH, "rb") as model_file:
        model = pickle.load(model_file)

    print("Enter values to test one prediction.")
    hour_of_transfer = int(input("hour_of_transfer (0-23): "))
    user_usual_hour = int(input("usual_hour_for_user (0-23): "))
    amount = float(input("amount: "))
    beneficiary_transfer_count_for_user = int(
        input("beneficiary_transfer_count_for_user: ")
    )
    avg_user_transfer = float(input("avg_user_transfer: "))
    user_transaction_count = int(input("user_transaction_count: "))
    time_since_last_transfer = float(input("time_since_last_transfer_minutes: "))
    transfers_last_1h = int(input("transfers_last_1h: "))

    prediction_frame = build_prediction_frame(
        hour_of_transfer=hour_of_transfer,
        user_usual_hour=user_usual_hour,
        amount=amount,
        beneficiary_transfer_count_for_user=beneficiary_transfer_count_for_user,
        avg_user_transfer=avg_user_transfer,
        user_transaction_count=user_transaction_count,
        time_since_last_transfer=time_since_last_transfer,
        transfers_last_1h=transfers_last_1h,
    )

    prediction = model.predict(prediction_frame)[0]
    probability = model.predict_proba(prediction_frame)[0][1]
    prediction_label = "fraud" if prediction == 1 else "not fraud"

    print("\nPrediction:", prediction_label)
    print(f"Fraud probability: {probability * 100:.1f}%")


if __name__ == "__main__":
    main()
