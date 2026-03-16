"""
Generate a realistic fraud detection dataset.
Includes normal transactions plus seeded anomalies:
- Amount spikes
- Location jumps
- Transaction velocity bursts
- New merchant / device combos
"""

import pandas as pd
import numpy as np
import uuid
from datetime import datetime, timedelta
import random
import os

random.seed(42)
np.random.seed(42)

# --- Configuration ---
N_USERS = 80
N_TRANSACTIONS = 2000
FRAUD_RATE = 0.08  # ~8% anomalous transactions
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

MERCHANTS = [
    ("Amazon", "E-commerce"),
    ("Walmart", "Retail"),
    ("Target", "Retail"),
    ("Starbucks", "Food & Beverage"),
    ("McDonald's", "Food & Beverage"),
    ("Shell", "Gas Station"),
    ("Uber", "Transportation"),
    ("Netflix", "Entertainment"),
    ("Spotify", "Entertainment"),
    ("Apple Store", "Electronics"),
    ("Best Buy", "Electronics"),
    ("CVS Pharmacy", "Healthcare"),
    ("Planet Fitness", "Health & Fitness"),
    ("Delta Airlines", "Travel"),
    ("Airbnb", "Travel"),
    ("Marriott Hotels", "Travel"),
    ("Steam Games", "Entertainment"),
    ("DoorDash", "Food Delivery"),
    ("Grubhub", "Food Delivery"),
    ("Venmo", "Transfer"),
    # Suspicious merchants
    ("CryptoExchange Pro", "Cryptocurrency"),
    ("QuickCash ATM", "ATM"),
    ("Offshore Trading Ltd", "Finance"),
    ("FastTransfer Wire", "Transfer"),
    ("Anonymous Market", "Unknown"),
]

DEVICES = ["mobile_ios", "mobile_android", "desktop_chrome", "desktop_safari",
           "tablet_ios", "tablet_android", "pos_terminal"]

CITIES = [
    ("New York", 40.7128, -74.0060),
    ("Los Angeles", 34.0522, -118.2437),
    ("Chicago", 41.8781, -87.6298),
    ("Houston", 29.7604, -95.3698),
    ("Phoenix", 33.4484, -112.0740),
    ("Philadelphia", 39.9526, -75.1652),
    ("San Antonio", 29.4241, -98.4936),
    ("San Diego", 32.7157, -117.1611),
    ("Dallas", 32.7767, -96.7970),
    ("San Francisco", 37.7749, -122.4194),
    ("Seattle", 47.6062, -122.3321),
    ("Miami", 25.7617, -80.1918),
    ("Boston", 42.3601, -71.0589),
    ("Denver", 39.7392, -104.9903),
    ("Austin", 30.2672, -97.7431),
    # International (anomalous)
    ("London", 51.5074, -0.1278),
    ("Paris", 48.8566, 2.3522),
    ("Tokyo", 35.6762, 139.6503),
    ("Lagos", 6.5244, 3.3792),
    ("Moscow", 55.7558, 37.6173),
]


def generate_user_profiles(n_users: int) -> dict:
    """Create realistic spending profiles per user."""
    profiles = {}
    for i in range(n_users):
        user_id = f"U{str(i+1).zfill(5)}"
        home_city = random.choice(CITIES[:15])  # US cities only
        profiles[user_id] = {
            "home_city": home_city,
            "avg_spend": random.uniform(20, 300),
            "std_spend": random.uniform(10, 80),
            "preferred_devices": random.sample(DEVICES[:5], k=random.randint(1, 3)),
            "regular_merchants": random.sample(MERCHANTS[:20], k=random.randint(3, 8)),
        }
    return profiles


def generate_normal_transaction(
    user_id: str,
    profile: dict,
    timestamp: datetime,
    tx_counter: list,
) -> dict:
    """Standard legitimate transaction."""
    tx_counter[0] += 1
    merchant, category = random.choice(profile["regular_merchants"])
    city_name, lat, lon = profile["home_city"]
    # Add small jitter to location (same metro area)
    lat += random.uniform(-0.15, 0.15)
    lon += random.uniform(-0.15, 0.15)

    amount = max(1.0, np.random.normal(profile["avg_spend"], profile["std_spend"]))

    return {
        "transaction_id": f"TXN{tx_counter[0]:06d}",
        "user_id": user_id,
        "timestamp": timestamp.isoformat(),
        "amount": round(amount, 2),
        "merchant": merchant,
        "merchant_category": category,
        "location": city_name,
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "device_type": random.choice(profile["preferred_devices"]),
    }


def inject_amount_anomaly(tx: dict, profile: dict) -> dict:
    """Spike amount to 5-15x normal."""
    multiplier = random.uniform(5, 15)
    tx["amount"] = round(profile["avg_spend"] * multiplier, 2)
    return tx


def inject_location_anomaly(tx: dict) -> dict:
    """Move transaction to a distant foreign city."""
    foreign_cities = CITIES[15:]
    city_name, lat, lon = random.choice(foreign_cities)
    tx["location"] = city_name
    tx["latitude"] = round(lat + random.uniform(-0.05, 0.05), 4)
    tx["longitude"] = round(lon + random.uniform(-0.05, 0.05), 4)
    return tx


def inject_velocity_burst(
    user_id: str,
    profile: dict,
    base_time: datetime,
    tx_counter: list,
    burst_count: int = 8,
) -> list:
    """Rapid fire transactions in a short window."""
    burst = []
    for i in range(burst_count):
        t = base_time + timedelta(minutes=random.randint(1, 10))
        tx = generate_normal_transaction(user_id, profile, t, tx_counter)
        tx["merchant"] = random.choice(MERCHANTS[20:])[0]  # Suspicious merchants
        tx["merchant_category"] = random.choice(MERCHANTS[20:])[1]
        burst.append(tx)
    return burst


def inject_new_device(tx: dict) -> dict:
    """Use a device not in user's profile."""
    tx["device_type"] = random.choice(["unknown_device", "emulator_android", "pos_skimmer"])
    return tx


def inject_suspicious_merchant(tx: dict) -> dict:
    """Replace merchant with high-risk merchant."""
    merchant, category = random.choice(MERCHANTS[20:])
    tx["merchant"] = merchant
    tx["merchant_category"] = category
    return tx


def generate_dataset(n_transactions: int = N_TRANSACTIONS) -> pd.DataFrame:
    profiles = generate_user_profiles(N_USERS)
    user_ids = list(profiles.keys())

    all_transactions = []
    tx_counter = [0]

    # Base start date
    start_date = datetime(2024, 1, 1)

    # Assign transaction counts per user
    for _ in range(n_transactions):
        user_id = random.choice(user_ids)
        profile = profiles[user_id]
        days_offset = random.randint(0, 364)
        hour = random.randint(6, 23)
        minute = random.randint(0, 59)
        ts = start_date + timedelta(days=days_offset, hours=hour, minutes=minute)

        tx = generate_normal_transaction(user_id, profile, ts, tx_counter)

        # Randomly inject fraud patterns
        rand = random.random()
        if rand < 0.03:
            tx = inject_amount_anomaly(tx, profile)
        elif rand < 0.05:
            tx = inject_location_anomaly(tx)
        elif rand < 0.06:
            tx = inject_new_device(tx)
        elif rand < 0.07:
            tx = inject_suspicious_merchant(tx)

        all_transactions.append(tx)

    # Inject velocity burst events for ~5 users
    burst_users = random.sample(user_ids, k=5)
    for user_id in burst_users:
        profile = profiles[user_id]
        burst_date = start_date + timedelta(
            days=random.randint(0, 364),
            hours=random.randint(8, 22)
        )
        burst_txs = inject_velocity_burst(user_id, profile, burst_date, tx_counter)
        all_transactions.extend(burst_txs)

    # Inject combined fraud (high risk): amount spike + location + new device
    for _ in range(int(n_transactions * 0.02)):
        user_id = random.choice(user_ids)
        profile = profiles[user_id]
        ts = start_date + timedelta(
            days=random.randint(0, 364),
            hours=random.randint(0, 23)
        )
        tx = generate_normal_transaction(user_id, profile, ts, tx_counter)
        tx = inject_amount_anomaly(tx, profile)
        tx = inject_location_anomaly(tx)
        tx = inject_new_device(tx)
        tx = inject_suspicious_merchant(tx)
        all_transactions.append(tx)

    df = pd.DataFrame(all_transactions)
    df = df.sort_values("timestamp").reset_index(drop=True)
    return df


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("Generating fraud detection dataset...")
    df = generate_dataset(N_TRANSACTIONS)
    output_path = os.path.join(OUTPUT_DIR, "transactions.csv")
    df.to_csv(output_path, index=False)
    print(f"Dataset saved: {output_path}")
    print(f"Total transactions: {len(df)}")
    print(f"Unique users: {df['user_id'].nunique()}")
    print(f"Date range: {df['timestamp'].min()} — {df['timestamp'].max()}")
    print("\nSample rows:")
    print(df.head())
