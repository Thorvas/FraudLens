from pathlib import Path

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split

from prepare_ml_data import _encode_hour, prepare_ml_data


def main() -> None:
    base = Path(__file__).resolve().parent
    db_path = base / "fraudlens.db"

    rows = prepare_ml_data(db_path=db_path)
    df = pd.DataFrame(rows)

    feature_columns = [
        "hour_deviation",
        "amount",
        "beneficiary_transfer_count_for_user",
        "amount_ratio_to_avg",
        "user_transaction_count",
        "time_since_last_transfer",
        "transfers_last_1h",
    ]

    X = df[feature_columns]
    y = df["is_fraud"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=3
    )

    model = LogisticRegression()
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, zero_division=0)
    recall = recall_score(y_test, predictions, zero_division=0)
    cm = confusion_matrix(y_test, predictions)

    print("Training rows:", len(X_train))
    print("Test rows:", len(X_test))
    print("Accuracy:", round(accuracy, 3))
    print("Precision:", round(precision, 3))
    print("Recall:", round(recall, 3))
    print("Confusion matrix:")
    print(cm)
    print("\nCoefficients:")
    for column, value in zip(feature_columns, model.coef_[0]):
        print(f"{column}: {value:.4f}")
    print("Intercept:", round(model.intercept_[0], 4))

    print("\nEnter values to test one manual prediction.")
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
    hour_sin, hour_cos = _encode_hour(hour_of_transfer)
    user_avg_hour_sin, user_avg_hour_cos = _encode_hour(user_usual_hour)

    manual_df = pd.DataFrame([
        {
            "hour_deviation": 1 - (
                hour_sin * user_avg_hour_sin + hour_cos * user_avg_hour_cos
            ),
            "amount": amount,
            "beneficiary_transfer_count_for_user": beneficiary_transfer_count_for_user,
            "amount_ratio_to_avg": (
                amount / avg_user_transfer if avg_user_transfer > 0 else 1.0
            ),
            "user_transaction_count": user_transaction_count,
            "time_since_last_transfer": time_since_last_transfer,
            "transfers_last_1h": transfers_last_1h,
        }
    ])

    manual_prediction = model.predict(manual_df)[0]
    manual_probability = model.predict_proba(manual_df)[0][1]

    print("\nManual prediction:", manual_prediction)
    print("Fraud probability:", round(manual_probability, 3))
    prediction_label = "fraud" if manual_prediction == 1 else "not fraud"
    print(f"Prediction: {prediction_label}")
    print(f"Probability: {manual_probability * 100:.1f}%")


if __name__ == "__main__":
    main()
