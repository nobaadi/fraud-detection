"""
Download and preprocess IEEE-CIS Fraud Detection dataset from Kaggle.
Maps Kaggle columns to our schema:
- TransactionID → transaction_id
- card1 (card ID) → user_id (as proxy for user account)
- TransactionAmt → amount
- ProductCD → merchant_category
- addr1/addr2 → location
- isFraud → fraud_label (for training)
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime, timedelta
import subprocess

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MIRROR_DATASETS = [
    "lnasiri007/ieeecis-fraud-detection",
    "niangmohamed/ieeecis-fraud-detection",
    "giahuytranviet/ieee-fraud-detection",
]


def _unzip_archive(zip_path: str):
    import zipfile
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(OUTPUT_DIR)
    os.remove(zip_path)


def _find_train_csv() -> str | None:
    candidate = os.path.join(OUTPUT_DIR, "train_transaction.csv")
    if os.path.exists(candidate):
        return candidate
    for root, _, files in os.walk(OUTPUT_DIR):
        if "train_transaction.csv" in files:
            return os.path.join(root, "train_transaction.csv")
    return None

def download_kaggle_dataset():
    """Download IEEE-CIS dataset from Kaggle competition, fallback to public mirrors."""
    print("Downloading IEEE-CIS Fraud Detection dataset from Kaggle...")

    # Attempt 1: official competition files.
    try:
        completed = subprocess.run(
            [sys.executable, "-m", "kaggle", "competitions", "download", "-c", "ieee-fraud-detection"],
            cwd=OUTPUT_DIR,
            check=True,
            capture_output=True,
            text=True,
        )
        if completed.stdout:
            print(completed.stdout)
        competition_zip = os.path.join(OUTPUT_DIR, "ieee-fraud-detection.zip")
        if os.path.exists(competition_zip):
            _unzip_archive(competition_zip)
            print("Downloaded from Kaggle competition and extracted.")
            return
    except subprocess.CalledProcessError as e:
        print("Competition download failed. Trying public Kaggle mirrors...")
        if e.stderr:
            print(e.stderr.strip())

    # Attempt 2: public mirror datasets.
    for ref in MIRROR_DATASETS:
        try:
            print(f"Trying mirror dataset: {ref}")
            completed = subprocess.run(
                [sys.executable, "-m", "kaggle", "datasets", "download", "-d", ref, "--force"],
                cwd=OUTPUT_DIR,
                check=True,
                capture_output=True,
                text=True,
            )
            if completed.stdout:
                print(completed.stdout)

            zip_name = ref.split("/")[1] + ".zip"
            zip_path = os.path.join(OUTPUT_DIR, zip_name)
            if os.path.exists(zip_path):
                _unzip_archive(zip_path)

            if _find_train_csv():
                print(f"Downloaded and extracted from mirror: {ref}")
                return
        except subprocess.CalledProcessError as e:
            print(f"Mirror {ref} failed.")
            if e.stderr:
                print(e.stderr.strip())

    print("All download attempts failed.")
    print("Option A: Accept competition rules at https://www.kaggle.com/competitions/ieee-fraud-detection")
    print("Option B: Try another public mirror dataset manually.")
    sys.exit(1)

def load_kaggle_data():
    """Load the raw Kaggle CSV files."""
    train_path = os.path.join(OUTPUT_DIR, "train_transaction.csv")
    if not os.path.exists(train_path):
        download_kaggle_dataset()
    
    print(f"Loading transactions from {train_path}...")
    df = pd.read_csv(train_path, dtype={"isFraud": int})
    print(f"Loaded {len(df)} transactions.")
    return df

def map_to_schema(df: pd.DataFrame) -> pd.DataFrame:
    """
    Map Kaggle columns to our application schema.
    """
    result = pd.DataFrame()
    
    # transaction_id: use TransactionID as-is
    result["transaction_id"] = df["TransactionID"].astype(str)
    
    # user_id: use card1 (card ID) as proxy for user account
    result["user_id"] = "U" + df["card1"].astype(str).str.zfill(5)
    
    # timestamp: synthesize from transaction index (Kaggle doesn't have timestamps)
    # Assume transactions are chronologically ordered, spread across 6 months
    base_date = datetime(2024, 1, 1)
    days = np.linspace(0, 180, len(df)).astype(int)
    hours = np.random.randint(6, 24, len(df))
    minutes = np.random.randint(0, 60, len(df))
    result["timestamp"] = [
        (base_date + timedelta(days=int(d), hours=int(h), minutes=int(m))).isoformat()
        for d, h, m in zip(days, hours, minutes)
    ]
    
    # amount: TransactionAmt
    result["amount"] = df["TransactionAmt"].fillna(0.0).astype(float)
    
    # merchant: derive from ProductCD or use generic names
    product_map = {
        "W": "Retail_W",
        "H": "Health_H",
        "S": "Services_S",
        "C": "Credit_C",
        "R": "Transport_R"
    }
    result["merchant"] = df["ProductCD"].map(product_map).fillna("Merchant_Other")
    
    # merchant_category: use ProductCD as category
    result["merchant_category"] = df["ProductCD"].fillna("Unknown")
    
    # location: combine addr1 and addr2 (postal codes in Kaggle)
    result["location"] = (
        "LOC_" + df["addr1"].astype(str).str[:3] + "_" + df["addr2"].astype(str).str[:2]
    ).fillna("LOC_Unknown")
    
    # latitude/longitude: create pseudo-coordinates (not in Kaggle data, but required by schema)
    # Use addr1 as seed for consistent lat/lon per location
    np.random.seed(42)
    lat_base = 40.0 + (df["addr1"].fillna(0) % 100) / 100.0 * 50.0
    lon_base = -74.0 + (df["addr1"].fillna(0) % 100) / 100.0 * 50.0
    result["latitude"] = lat_base + np.random.randn(len(df)) * 0.5
    result["longitude"] = lon_base + np.random.randn(len(df)) * 0.5
    
    # device_type: derive from browser/OS info if available, else assign random
    device_options = ["mobile_ios", "mobile_android", "desktop_chrome", "desktop_safari", "tablet_ios"]
    result["device_type"] = np.random.choice(device_options, len(df))
    
    # fraud_label: ground truth from isFraud (will be used for training)
    result["fraud_label"] = df["isFraud"].astype(int)
    
    return result

def generate_dataset() -> pd.DataFrame:
    """Main pipeline: download, load, and map Kaggle data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    kaggle_df = load_kaggle_data()
    mapped_df = map_to_schema(kaggle_df)
    return mapped_df

if __name__ == "__main__":
    print("=" * 70)
    print("IEEE-CIS Fraud Detection Dataset Generator")
    print("=" * 70)
    
    df = generate_dataset()
    
    # Save the mapped dataset
    output_path = os.path.join(OUTPUT_DIR, "transactions.csv")
    df.to_csv(output_path, index=False)
    print(f"\n✓ Mapped dataset saved: {output_path}")
    print(f"  Total transactions: {len(df):,}")
    print(f"  Unique users: {df['user_id'].nunique():,}")
    print(f"  Date range: {df['timestamp'].min()} → {df['timestamp'].max()}")
    print(f"  Fraud cases: {df['fraud_label'].sum():,} ({100*df['fraud_label'].mean():.1f}%)")
    print("\nSample rows:")
    print(df.head(10))
    print("\n" + "=" * 70)
