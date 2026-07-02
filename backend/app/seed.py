"""Seed demo transactions on first startup if the database is empty."""

import json
import random
import uuid
from datetime import datetime, timedelta

import pandas as pd
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.feature_engineering import engineer_features_bulk
from app.fraud_models import get_scoring_engine
from app.models import Transaction

random.seed(42)

_REF = datetime(2026, 6, 30)

_USERS = [
    # (user_id, mean_amount, std_amount, primary_device)
    ("u_alice", 95.0, 30.0, "mobile"),
    ("u_ben", 420.0, 110.0, "desktop"),
    ("u_cara", 38.0, 14.0, "mobile"),
    ("u_dana", 175.0, 55.0, "mobile"),
    ("u_evan", 260.0, 75.0, "desktop"),
]

_MERCHANTS = [
    ("FairPrice Finest", "Grocery"),
    ("Grab Food", "Food Delivery"),
    ("Lazada SG", "Online Retail"),
    ("Uniqlo Orchard", "Clothing"),
    ("Cathay Cineplexes", "Entertainment"),
    ("Shell Petrol", "Fuel"),
    ("BreadTalk", "Food & Beverage"),
    ("Watsons", "Health & Beauty"),
    ("McDonald's", "Food & Beverage"),
    ("Giant Hypermart", "Grocery"),
]

_LOCATIONS = [
    ("Orchard Road", 1.3048, 103.8318),
    ("Tampines Mall", 1.3550, 103.9450),
    ("Jurong East", 1.3332, 103.7436),
    ("Woodlands", 1.4382, 103.7890),
    ("Bedok", 1.3241, 103.9304),
    ("Bishan", 1.3519, 103.8484),
    ("Ang Mo Kio", 1.3697, 103.8458),
    ("Clementi", 1.3150, 103.7650),
]


def _row(user_id, amount, merchant, cat, location, lat, lon, device, dt):
    return {
        "transaction_id": uuid.uuid4().hex[:16],
        "user_id": user_id,
        "timestamp": dt,
        "amount": round(max(1.0, amount), 2),
        "merchant": merchant,
        "merchant_category": cat,
        "location": location,
        "latitude": lat,
        "longitude": lon,
        "device_type": device,
    }


def _generate() -> list[dict]:
    rows = []

    # Normal spending history for each user (past 30 days)
    for user_id, mean_amt, std_amt, device in _USERS:
        loc_name, lat, lon = random.choice(_LOCATIONS)
        for i in range(10):
            days_ago = random.randint(2, 30)
            dt = _REF - timedelta(days=days_ago, hours=random.randint(0, 14), minutes=random.randint(0, 59))
            amt = random.gauss(mean_amt, std_amt)
            merchant, cat = random.choice(_MERCHANTS[:8])
            rows.append(_row(user_id, amt, merchant, cat, loc_name, lat, lon, device, dt))

    # Suspicious 1: velocity burst — u_alice makes 6 transactions in 40 minutes
    burst_base = _REF - timedelta(days=3, hours=2)
    for i in range(6):
        dt = burst_base + timedelta(minutes=i * 7)
        rows.append(_row("u_alice", 149.90, "Lazada SG", "Online Retail",
                         "Online", 1.3048, 103.8318, "mobile", dt))

    # Suspicious 2: large amount anomaly — u_cara (normally ~$38) spends $3,850
    rows.append(_row("u_cara", 3850.0, "Apple Orchard Road", "Electronics",
                     "Orchard Road", 1.3048, 103.8318, "desktop",
                     _REF - timedelta(days=5, hours=16)))

    # Suspicious 3: location anomaly — u_ben transacts in KL two hours after Singapore
    rows.append(_row("u_ben", 310.0, "Pavilion KL", "Shopping",
                     "Kuala Lumpur", 3.1490, 101.7100, "mobile",
                     _REF - timedelta(days=8, hours=10)))

    # Suspicious 4: new device + new high-value merchant for u_dana
    rows.append(_row("u_dana", 1450.0, "Courts Megastore", "Electronics",
                     "Jurong East", 1.3332, 103.7436, "tablet",
                     _REF - timedelta(days=12, hours=19)))

    return rows


def seed_database() -> None:
    """Insert demo transactions if the database is empty. Safe to call on every startup."""
    db: Session = SessionLocal()
    try:
        if db.query(Transaction).count() > 0:
            return

        rows = _generate()
        df = pd.DataFrame(rows)
        df_featured = engineer_features_bulk(df)

        scoring_engine = get_scoring_engine()
        scores = scoring_engine.score(df_featured)
        score_map = {s["transaction_id"]: s for s in scores}

        for _, row in df_featured.iterrows():
            tid = str(row["transaction_id"])
            s = score_map.get(tid, {})
            db.add(Transaction(
                transaction_id=tid,
                user_id=str(row["user_id"]),
                timestamp=pd.Timestamp(row["timestamp"]).to_pydatetime(),
                amount=float(row["amount"]),
                merchant=str(row["merchant"]),
                merchant_category=str(row["merchant_category"]),
                location=str(row["location"]),
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                device_type=str(row["device_type"]),
                amount_deviation=float(row.get("amount_deviation") or 0),
                location_deviation=float(row.get("location_deviation") or 0),
                transaction_velocity=int(row.get("transaction_velocity") or 0),
                merchant_novelty=bool(row.get("merchant_novelty", False)),
                device_novelty=bool(row.get("device_novelty", False)),
                fraud_probability=s.get("fraud_probability"),
                risk_level=s.get("risk_level"),
                risk_factors=json.dumps(s.get("risk_factors", [])),
            ))

        db.commit()
        print(f"[seed] Inserted {len(rows)} demo transactions.")
    except Exception as e:
        db.rollback()
        print(f"[seed] Seed failed (non-fatal): {e}")
    finally:
        db.close()
