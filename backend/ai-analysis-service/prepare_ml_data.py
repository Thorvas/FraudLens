"""
Prepare ML-ready features from the fraud database.
Reads from SQLite and produces a CSV (and optionally a DataFrame) with:
  hour_deviation, amount, beneficiary_transfer_count_for_user, amount_ratio_to_avg,
  user_transaction_count, time_since_last_transfer, transfers_last_1h,
  is_fraud
"""
import csv
import math
import sqlite3
from collections import defaultdict, deque
from datetime import datetime
from pathlib import Path
import pandas as pd


def _parse_occurred_at(occurred_at: str) -> datetime:
    """Return datetime from ISO timestamp."""
    ts = occurred_at.replace("Z", "+00:00")
    return datetime.fromisoformat(ts)


def _encode_hour(hour: int) -> tuple[float, float]:
    """Encode hour-of-day as a point on a circle."""
    angle = 2 * math.pi * hour / 24
    return math.sin(angle), math.cos(angle)


FEATURE_COLUMNS = [
    "hour_deviation",
    "amount",
    "beneficiary_transfer_count_for_user",
    "amount_ratio_to_avg",
    "user_transaction_count",
    "time_since_last_transfer",
    "transfers_last_1h",
    "is_fraud",
]


def load_ml_features(conn: sqlite3.Connection) -> list[dict]:
    """
    Query the database for events, then build the ML feature rows using
    only prior events from the same user to avoid future leakage.
    """
    query = """
    SELECT
        e.user_id,
        e.occurred_at,
        CAST(json_extract(e.payload, '$.amount') AS REAL)           AS amount,
        json_extract(e.payload, '$.beneficiaryId')                  AS beneficiary_id,
        CAST(json_extract(e.payload, '$.isFraud') AS INT)          AS is_fraud,
        ROW_NUMBER() OVER (
            PARTITION BY e.user_id
            ORDER BY e.id
        ) - 1 AS user_transaction_count,
        ROW_NUMBER() OVER (
            PARTITION BY e.user_id, json_extract(e.payload, '$.beneficiaryId')
            ORDER BY e.id
        ) - 1 AS beneficiary_transfer_count_for_user
    FROM event e
    ORDER BY e.id
    """

    user_last_transfer_at: dict[str, datetime] = {}
    user_recent_transfers: dict[str, deque[datetime]] = defaultdict(deque)
    user_hour_sums: dict[str, tuple[float, float]] = defaultdict(lambda: (0.0, 0.0))
    user_amount_sums: dict[str, float] = defaultdict(float)
    rows = []

    for row in conn.execute(query).fetchall():
        (
            user_id,
            occurred_at,
            amount,
            _beneficiary_id,
            is_fraud,
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

        rows.append({
            "hour_deviation": hour_deviation,
            "amount": amount,
            "beneficiary_transfer_count_for_user": int(beneficiary_transfer_count_for_user),
            "amount_ratio_to_avg": amount_ratio_to_avg,
            "user_transaction_count": int(user_transaction_count),
            "time_since_last_transfer": time_since_last_transfer,
            "transfers_last_1h": transfers_last_1h,
            "is_fraud": int(is_fraud or 0),
        })

        recent_transfers.append(occurred_at_dt)
        user_last_transfer_at[user_id] = occurred_at_dt
        prev_hour_sum_sin, prev_hour_sum_cos = user_hour_sums[user_id]
        user_hour_sums[user_id] = (
            prev_hour_sum_sin + hour_sin,
            prev_hour_sum_cos + hour_cos,
        )
        user_amount_sums[user_id] += amount

    return rows


def prepare_ml_data(
    db_path: str | Path = "fraudlens.db",
    output_path: str | Path | None = None,
):
    """
    Load ML features from the database and optionally save to CSV.
    Returns the feature data as a list of dicts. If pandas is installed,
    also returns a DataFrame when used as the sole return value (see main).
    """
    db_path = Path(db_path)
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    conn = sqlite3.connect(db_path)
    try:
        rows = load_ml_features(conn)
    finally:
        conn.close()

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=FEATURE_COLUMNS)
            w.writeheader()
            w.writerows(rows)
        print(f"Saved ML features to {output_path} ({len(rows)} rows)")

    return rows


def main() -> None:
    base = Path(__file__).resolve().parent
    db_path = base / "fraudlens.db"
    output_path = base / "ml_features.csv"
    rows = prepare_ml_data(db_path=db_path, output_path=output_path)

    df = pd.DataFrame(rows, columns=FEATURE_COLUMNS)
    print(df.head(10))
    print("\nShape:", df.shape)
    print("Columns:", list(df.columns))
    print("is_fraud value counts:\n", df["is_fraud"].value_counts())


if __name__ == "__main__":
    main()
