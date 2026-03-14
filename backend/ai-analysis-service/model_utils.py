from pathlib import Path

import pandas as pd

from prepare_ml_data import _encode_hour


MODEL_PATH = Path(__file__).resolve().parent / "fraud_model.pkl"

FEATURE_COLUMNS = [
    "hour_deviation",
    "amount",
    "beneficiary_transfer_count_for_user",
    "amount_ratio_to_avg",
    "user_transaction_count",
    "time_since_last_transfer",
    "transfers_last_1h",
]


def build_prediction_frame(
    *,
    hour_of_transfer: int,
    user_usual_hour: int,
    amount: float,
    beneficiary_transfer_count_for_user: int,
    avg_user_transfer: float,
    user_transaction_count: int,
    time_since_last_transfer: float,
    transfers_last_1h: int,
) -> pd.DataFrame:
    hour_sin, hour_cos = _encode_hour(hour_of_transfer)
    user_avg_hour_sin, user_avg_hour_cos = _encode_hour(user_usual_hour)

    return pd.DataFrame([
        {
            "hour_deviation": 1
            - (hour_sin * user_avg_hour_sin + hour_cos * user_avg_hour_cos),
            "amount": amount,
            "beneficiary_transfer_count_for_user": beneficiary_transfer_count_for_user,
            "amount_ratio_to_avg": (
                amount / avg_user_transfer if avg_user_transfer > 0 else 1.0
            ),
            "user_transaction_count": user_transaction_count,
            "time_since_last_transfer": time_since_last_transfer,
            "transfers_last_1h": transfers_last_1h,
        }
    ], columns=FEATURE_COLUMNS)
