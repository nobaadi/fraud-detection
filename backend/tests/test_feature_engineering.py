import pandas as pd
import numpy as np
import pytest

from app.feature_engineering import haversine_distance, engineer_features_bulk


def _base_row(
    txn_id="t1",
    user_id="u1",
    timestamp="2024-01-01 12:00:00",
    amount=100.0,
    merchant="ShopA",
    device="mobile",
    lat=1.3521,
    lon=103.8198,
):
    return {
        "transaction_id": txn_id,
        "user_id": user_id,
        "timestamp": timestamp,
        "amount": amount,
        "merchant": merchant,
        "device_type": device,
        "latitude": lat,
        "longitude": lon,
    }


# ── haversine ─────────────────────────────────────────────────────────────────

def test_haversine_same_point_is_zero():
    assert haversine_distance(1.35, 103.82, 1.35, 103.82) == 0.0


def test_haversine_singapore_to_kl():
    # Singapore (1.35, 103.82) to Kuala Lumpur (3.14, 101.69) ≈ 315-340 km
    dist = haversine_distance(1.3521, 103.8198, 3.1390, 101.6869)
    assert 310 < dist < 360


def test_haversine_symmetric():
    a = haversine_distance(1.35, 103.82, 3.14, 101.69)
    b = haversine_distance(3.14, 101.69, 1.35, 103.82)
    assert abs(a - b) < 0.01


# ── amount deviation ──────────────────────────────────────────────────────────

def test_amount_deviation_zero_for_first_transaction():
    df = pd.DataFrame([_base_row()])
    result = engineer_features_bulk(df)
    assert result["amount_deviation"].iloc[0] == 0.0


def test_amount_deviation_zero_for_second_transaction_same_amount():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 10:00:00", amount=100.0),
        _base_row("t2", timestamp="2024-01-01 11:00:00", amount=100.0),
    ])
    result = engineer_features_bulk(df)
    # Only one prior observation -- std undefined, should fall back to 0
    assert result["amount_deviation"].iloc[1] == 0.0


def test_amount_deviation_high_for_unusual_amount():
    rows = [_base_row(f"t{i}", timestamp=f"2024-01-0{i+1} 10:00:00", amount=100.0) for i in range(4)]
    rows.append(_base_row("t5", timestamp="2024-01-05 10:00:00", amount=2000.0))
    df = pd.DataFrame(rows)
    result = engineer_features_bulk(df)
    assert result["amount_deviation"].iloc[4] > 3.0


# ── merchant novelty ──────────────────────────────────────────────────────────

def test_merchant_novelty_true_for_first_visit():
    df = pd.DataFrame([_base_row(merchant="ShopA")])
    result = engineer_features_bulk(df)
    assert result["merchant_novelty"].iloc[0] is True or result["merchant_novelty"].iloc[0] == True


def test_merchant_novelty_false_for_repeat_visit():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 10:00:00", merchant="ShopA"),
        _base_row("t2", timestamp="2024-01-02 10:00:00", merchant="ShopA"),
    ])
    result = engineer_features_bulk(df)
    assert result["merchant_novelty"].iloc[1] == False


def test_merchant_novelty_independent_per_user():
    df = pd.DataFrame([
        _base_row("t1", user_id="u1", timestamp="2024-01-01 10:00:00", merchant="ShopA"),
        _base_row("t2", user_id="u2", timestamp="2024-01-01 11:00:00", merchant="ShopA"),
    ])
    result = engineer_features_bulk(df)
    # Both users visit ShopA for the first time -- both should be novel
    assert result["merchant_novelty"].iloc[0] == True
    assert result["merchant_novelty"].iloc[1] == True


# ── device novelty ────────────────────────────────────────────────────────────

def test_device_novelty_true_for_first_device():
    df = pd.DataFrame([_base_row(device="mobile")])
    result = engineer_features_bulk(df)
    assert result["device_novelty"].iloc[0] == True


def test_device_novelty_false_for_known_device():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 10:00:00", device="mobile"),
        _base_row("t2", timestamp="2024-01-02 10:00:00", device="mobile"),
    ])
    result = engineer_features_bulk(df)
    assert result["device_novelty"].iloc[1] == False


def test_device_novelty_true_for_new_device_type():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 10:00:00", device="mobile"),
        _base_row("t2", timestamp="2024-01-02 10:00:00", device="desktop"),
    ])
    result = engineer_features_bulk(df)
    assert result["device_novelty"].iloc[1] == True


# ── transaction velocity ──────────────────────────────────────────────────────

def test_velocity_zero_for_first_transaction():
    df = pd.DataFrame([_base_row()])
    result = engineer_features_bulk(df)
    assert result["transaction_velocity"].iloc[0] == 0


def test_velocity_counts_transactions_within_one_hour():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 12:00:00"),
        _base_row("t2", timestamp="2024-01-01 12:20:00"),
        _base_row("t3", timestamp="2024-01-01 12:40:00"),
    ])
    result = engineer_features_bulk(df)
    assert result["transaction_velocity"].iloc[2] == 2


def test_velocity_excludes_transactions_outside_window():
    df = pd.DataFrame([
        _base_row("t1", timestamp="2024-01-01 10:00:00"),
        _base_row("t2", timestamp="2024-01-01 12:00:00"),  # 2 hours later
        _base_row("t3", timestamp="2024-01-01 12:30:00"),
    ])
    result = engineer_features_bulk(df)
    # t3 should only see t2 within the past hour, not t1
    assert result["transaction_velocity"].iloc[2] == 1


# ── output schema ─────────────────────────────────────────────────────────────

def test_output_contains_all_required_feature_columns():
    df = pd.DataFrame([_base_row()])
    result = engineer_features_bulk(df)
    for col in ["amount_deviation", "transaction_velocity", "merchant_novelty",
                "device_novelty", "location_deviation"]:
        assert col in result.columns, f"Missing required column: {col}"


def test_no_nan_in_feature_columns():
    rows = [_base_row(f"t{i}", timestamp=f"2024-01-0{i+1} 12:00:00", amount=float(50 + i * 10))
            for i in range(5)]
    df = pd.DataFrame(rows)
    result = engineer_features_bulk(df)
    for col in ["amount_deviation", "transaction_velocity", "location_deviation"]:
        assert result[col].isna().sum() == 0, f"NaN found in {col}"
