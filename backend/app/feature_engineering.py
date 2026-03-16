import pandas as pd
import numpy as np
from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Transaction
from datetime import timedelta


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two lat/lon coordinates."""
    R = 6371  # Earth radius in km
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


def compute_amount_deviation(transaction: Transaction, db: Session) -> float:
    """How many std deviations is this amount from user's historical average."""
    history = (
        db.query(Transaction.amount)
        .filter(
            Transaction.user_id == transaction.user_id,
            Transaction.transaction_id != transaction.transaction_id,
            Transaction.timestamp < transaction.timestamp,
        )
        .all()
    )
    if len(history) < 2:
        return 0.0
    amounts = [h[0] for h in history]
    mean = np.mean(amounts)
    std = np.std(amounts)
    if std == 0:
        return 0.0
    return float((transaction.amount - mean) / std)


def compute_location_deviation(transaction: Transaction, db: Session) -> float:
    """Distance in km from the user's previous transaction location."""
    if transaction.latitude is None or transaction.longitude is None:
        return 0.0
    prev = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == transaction.user_id,
            Transaction.transaction_id != transaction.transaction_id,
            Transaction.timestamp < transaction.timestamp,
            Transaction.latitude.isnot(None),
        )
        .order_by(Transaction.timestamp.desc())
        .first()
    )
    if prev is None or prev.latitude is None:
        return 0.0
    return haversine_distance(
        transaction.latitude, transaction.longitude,
        prev.latitude, prev.longitude
    )


def compute_transaction_velocity(transaction: Transaction, db: Session, window_hours: int = 1) -> int:
    """Count transactions by user in the last N hours."""
    cutoff = transaction.timestamp - timedelta(hours=window_hours)
    count = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == transaction.user_id,
            Transaction.timestamp >= cutoff,
            Transaction.timestamp <= transaction.timestamp,
            Transaction.transaction_id != transaction.transaction_id,
        )
        .count()
    )
    return count


def compute_merchant_novelty(transaction: Transaction, db: Session) -> bool:
    """True if this is the first time user transacts with this merchant."""
    existing = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == transaction.user_id,
            Transaction.merchant == transaction.merchant,
            Transaction.transaction_id != transaction.transaction_id,
            Transaction.timestamp < transaction.timestamp,
        )
        .first()
    )
    return existing is None


def compute_device_novelty(transaction: Transaction, db: Session) -> bool:
    """True if this is the first time user uses this device."""
    existing = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == transaction.user_id,
            Transaction.device_type == transaction.device_type,
            Transaction.transaction_id != transaction.transaction_id,
            Transaction.timestamp < transaction.timestamp,
        )
        .first()
    )
    return existing is None


def engineer_features_for_transaction(transaction: Transaction, db: Session) -> Dict[str, Any]:
    """Compute all fraud signals for a single transaction."""
    return {
        "amount_deviation": compute_amount_deviation(transaction, db),
        "location_deviation": compute_location_deviation(transaction, db),
        "transaction_velocity": compute_transaction_velocity(transaction, db),
        "merchant_novelty": compute_merchant_novelty(transaction, db),
        "device_novelty": compute_device_novelty(transaction, db),
    }


def engineer_features_bulk(transactions_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute fraud signals for a batch of transactions using pandas.
    Expects columns: transaction_id, user_id, timestamp, amount, merchant,
                     device_type, latitude, longitude
    Returns df with additional signal columns.
    """
    df = transactions_df.copy()
    df = df.sort_values(["user_id", "timestamp"]).reset_index(drop=True)

    # Amount deviation per user
    df["user_mean_amount"] = df.groupby("user_id")["amount"].transform(
        lambda x: x.expanding().mean().shift(1)
    )
    df["user_std_amount"] = df.groupby("user_id")["amount"].transform(
        lambda x: x.expanding().std().shift(1)
    )
    df["amount_deviation"] = (
        (df["amount"] - df["user_mean_amount"]) / df["user_std_amount"].replace(0, np.nan)
    ).fillna(0.0)

    # Transaction velocity — O(n log n) using pandas rolling time window
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["user_id", "timestamp"]).reset_index(drop=True)
    df_indexed = df.set_index("timestamp")
    velocity_series = (
        df_indexed.groupby("user_id")["amount"]
        .rolling("1h", min_periods=1)
        .count()
        .astype(int)
        .sub(1).clip(lower=0)  # exclude current transaction, floor at 0
        .reset_index(level=0, drop=True)
    )
    df["transaction_velocity"] = velocity_series.values

    # Merchant novelty — first time a user transacts with a merchant (vectorized)
    df["merchant_novelty"] = ~df.duplicated(subset=["user_id", "merchant"], keep="first")

    # Device novelty — first time a user uses a device type (vectorized)
    df["device_novelty"] = ~df.duplicated(subset=["user_id", "device_type"], keep="first")

    # Location deviation (distance from previous transaction)
    df["prev_lat"] = df.groupby("user_id")["latitude"].shift(1)
    df["prev_lon"] = df.groupby("user_id")["longitude"].shift(1)

    def row_haversine(row):
        if pd.isna(row["prev_lat"]) or pd.isna(row["latitude"]):
            return 0.0
        return haversine_distance(
            row["latitude"], row["longitude"],
            row["prev_lat"], row["prev_lon"]
        )

    df["location_deviation"] = df.apply(row_haversine, axis=1)
    df = df.drop(columns=["user_mean_amount", "user_std_amount", "prev_lat", "prev_lon"])

    return df
