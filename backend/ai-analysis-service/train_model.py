import pickle
from pathlib import Path

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.model_selection import train_test_split

from model_utils import FEATURE_COLUMNS, MODEL_PATH
from prepare_ml_data import prepare_ml_data


def main() -> None:
    base = Path(__file__).resolve().parent
    db_path = base / "fraudlens.db"

    rows = prepare_ml_data(db_path=db_path)
    df = pd.DataFrame(rows)

    X = df[FEATURE_COLUMNS]
    y = df["is_fraud"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=3
    )

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
