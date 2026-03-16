import sqlite3
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path

import pandas as pd

from prepare_ml_data import _encode_hour, _parse_occurred_at


MODEL_PATH = Path(__file__).resolve().parent / "fraud_model.pkl"
DB_PATH = Path(__file__).resolve().parent / "fraudlens.db"

FEATURE_COLUMNS = [
    "hour_deviation",
    "amount",
    "beneficiary_transfer_count_for_user",
    "amount_ratio_to_avg",
    "user_transaction_count",
    "time_since_last_transfer",
    "transfers_last_1h",
    "beneficiary_transfers_last_1h",
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
    beneficiary_transfers_last_1h: int,
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
            "beneficiary_transfers_last_1h": beneficiary_transfers_last_1h,
        }
    ], columns=FEATURE_COLUMNS)


def build_prediction_frame_from_db(
    db_path: str | Path = DB_PATH,
    event_id: int | None = None,
) -> tuple[pd.DataFrame, dict]:
    db_path = Path(db_path)
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    query = """
    SELECT
        e.id,
        e.user_id,
        e.occurred_at,
        CAST(json_extract(e.payload, '$.amount') AS REAL) AS amount,
        COALESCE(
            json_extract(e.payload, '$.beneficiaryId'),
            json_extract(e.payload, '$.beneficiaryID')
        ) AS beneficiary_id,
        ROW_NUMBER() OVER (
            PARTITION BY e.user_id
            ORDER BY e.id
        ) - 1 AS user_transaction_count,
        ROW_NUMBER() OVER (
            PARTITION BY e.user_id, COALESCE(
                json_extract(e.payload, '$.beneficiaryId'),
                json_extract(e.payload, '$.beneficiaryID')
            )
            ORDER BY e.id
        ) - 1 AS beneficiary_transfer_count_for_user
    FROM event e
    ORDER BY e.id
    """

    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(query).fetchall()
    finally:
        conn.close()

    if not rows:
        raise ValueError("No events found in the database.")

    user_last_transfer_at: dict[int, datetime] = {}
    user_recent_transfers: dict[int, deque[datetime]] = defaultdict(deque)
    user_beneficiary_recent_transfers: dict[tuple[int, int | None], deque[datetime]] = (
        defaultdict(deque)
    )
    user_hour_sums: dict[int, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    user_amount_sums: dict[int, float] = defaultdict(float)
    selected_features = None
    selected_event_id = None

    for row in rows:
        (
            current_event_id,
            user_id,
            occurred_at,
            amount,
            beneficiary_id,
            user_transaction_count,
            beneficiary_transfer_count_for_user,
        ) = row
        occurred_at_dt = _parse_occurred_at(occurred_at)
        hour = occurred_at_dt.hour
        hour_sin, hour_cos = _encode_hour(hour)

        if user_transaction_count == 0:
            hour_deviation = 0.0
            amount_ratio_to_avg = 1.0
        else:
            hour_sum_sin, hour_sum_cos = user_hour_sums[user_id]
            user_avg_hour_sin = hour_sum_sin / user_transaction_count
            user_avg_hour_cos = hour_sum_cos / user_transaction_count
            hour_deviation = 1 - (
                hour_sin * user_avg_hour_sin + hour_cos * user_avg_hour_cos
            )
            prior_avg_user_transfer = user_amount_sums[user_id] / user_transaction_count
            amount_ratio_to_avg = amount / prior_avg_user_transfer

        last_transfer_at = user_last_transfer_at.get(user_id)
        if last_transfer_at is None:
            time_since_last_transfer = 0.0
        else:
            time_since_last_transfer = (
                occurred_at_dt - last_transfer_at
            ).total_seconds() / 60.0

        recent_transfers = user_recent_transfers[user_id]
        one_hour_ago = occurred_at_dt.timestamp() - 3600
        while recent_transfers and recent_transfers[0].timestamp() < one_hour_ago:
            recent_transfers.popleft()
        transfers_last_1h = len(recent_transfers)

        beneficiary_recent_transfers = user_beneficiary_recent_transfers[
            (user_id, beneficiary_id)
        ]
        while (
            beneficiary_recent_transfers
            and beneficiary_recent_transfers[0].timestamp() < one_hour_ago
        ):
            beneficiary_recent_transfers.popleft()
        beneficiary_transfers_last_1h = len(beneficiary_recent_transfers)

        current_features = {
            "hour_deviation": hour_deviation,
            "amount": amount,
            "beneficiary_transfer_count_for_user": int(
                beneficiary_transfer_count_for_user
            ),
            "amount_ratio_to_avg": amount_ratio_to_avg,
            "user_transaction_count": int(user_transaction_count),
            "time_since_last_transfer": time_since_last_transfer,
            "transfers_last_1h": transfers_last_1h,
            "beneficiary_transfers_last_1h": beneficiary_transfers_last_1h,
        }

        if event_id is None or current_event_id == event_id:
            selected_features = current_features
            selected_event_id = {
                "event_id": int(current_event_id),
                "account_id": int(user_id),
                "beneficiary_id": (
                    int(beneficiary_id) if beneficiary_id is not None else None
                ),
            }

        recent_transfers.append(occurred_at_dt)
        beneficiary_recent_transfers.append(occurred_at_dt)
        user_last_transfer_at[user_id] = occurred_at_dt
        prev_hour_sum_sin, prev_hour_sum_cos = user_hour_sums[user_id]
        user_hour_sums[user_id] = (
            prev_hour_sum_sin + hour_sin,
            prev_hour_sum_cos + hour_cos,
        )
        user_amount_sums[user_id] += amount

    if selected_features is None:
        raise ValueError(f"Event {event_id} not found in the database.")

    return (
        pd.DataFrame([selected_features], columns=FEATURE_COLUMNS),
        selected_event_id,
    )
