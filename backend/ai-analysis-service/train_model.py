import pickle
from pathlib import Path

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score

from model_utils import FEATURE_COLUMNS, MODEL_PATH
from prepare_ml_data import prepare_ml_data


def main() -> None:
    base = Path(__file__).resolve().parent
    db_path = base / "fraudlens.db"

    rows = prepare_ml_data(db_path=db_path)
    df = pd.DataFrame(rows).sort_values("occurred_at").reset_index(drop=True)

    split_index = int(len(df) * 0.8)
    if split_index == 0 or split_index == len(df):
        raise ValueError("Not enough rows for a time-based split.")

    train_df = df.iloc[:split_index]
    test_df = df.iloc[split_index:]

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["is_fraud"]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["is_fraud"]

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    with open(MODEL_PATH, "wb") as model_file:
        pickle.dump(model, model_file)

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
    print(f"Saved model to {MODEL_PATH}")
    print("\nCoefficients:")
    for column, value in zip(FEATURE_COLUMNS, model.coef_[0]):
        print(f"{column}: {value:.4f}")
    print("Intercept:", round(model.intercept_[0], 4))


if __name__ == "__main__":
    main()
