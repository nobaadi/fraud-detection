import pandas as pd
import numpy as np
import pytest

from app.fraud_models import FraudScoringEngine, FEATURE_COLUMNS


def _synthetic_df(n: int = 200, seed: int = 42) -> pd.DataFrame:
    """
    Build a labelled synthetic dataset where the first 10% of rows are high-signal
    anomalies. No fraud labels column -- exercises the pseudo-label path.
    """
    rng = np.random.default_rng(seed)
    n_anom = max(1, int(n * 0.10))
    rows = []
    for i in range(n):
        anom = i < n_anom
        rows.append({
            "transaction_id": f"tx{i}",
            "amount_deviation": rng.normal(6.0 if anom else 0.0, 0.5),
            "location_deviation": rng.uniform(800, 2000) if anom else rng.uniform(0, 30),
            "transaction_velocity": int(rng.integers(8, 15)) if anom else int(rng.integers(0, 2)),
            "merchant_novelty": True if anom else bool(rng.integers(0, 2)),
            "device_novelty": True if anom else False,
            "amount": rng.uniform(2000, 9999) if anom else rng.uniform(5, 300),
        })
    return pd.DataFrame(rows)


# ── training ──────────────────────────────────────────────────────────────────

def test_engine_trains_without_error():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df())
    assert engine._trained is True


def test_all_three_sub_models_populated_after_training():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df())
    assert engine.isolation_forest is not None
    assert engine.logistic_reg is not None
    assert engine.random_forest is not None


# ── scoring ───────────────────────────────────────────────────────────────────

def test_fraud_probabilities_are_bounded():
    engine = FraudScoringEngine()
    df = _synthetic_df()
    engine.train(df)
    results = engine.score(df.head(30))
    for r in results:
        assert 0.0 <= r["fraud_probability"] <= 1.0, (
            f"Out-of-range probability: {r['fraud_probability']}"
        )


def test_score_output_schema():
    engine = FraudScoringEngine()
    df = _synthetic_df(50)
    engine.train(df)
    results = engine.score(df.head(5))
    assert len(results) == 5
    for r in results:
        assert {"transaction_id", "fraud_probability", "risk_level", "risk_factors"} <= r.keys()


def test_high_anomaly_transaction_scores_elevated():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df(300))
    suspicious = pd.DataFrame([{
        "transaction_id": "sus",
        "amount_deviation": 12.0,
        "location_deviation": 8000.0,
        "transaction_velocity": 20,
        "merchant_novelty": True,
        "device_novelty": True,
        "amount": 9500.0,
    }])
    result = engine.score(suspicious)[0]
    assert result["fraud_probability"] > 0.4, (
        f"Expected elevated score for obvious anomaly, got {result['fraud_probability']}"
    )


def test_normal_transaction_does_not_score_high():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df(300))
    normal = pd.DataFrame([{
        "transaction_id": "norm",
        "amount_deviation": 0.1,
        "location_deviation": 0.8,
        "transaction_velocity": 0,
        "merchant_novelty": False,
        "device_novelty": False,
        "amount": 18.0,
    }])
    result = engine.score(normal)[0]
    assert result["risk_level"] in ("Low", "Medium"), (
        f"Expected Low/Medium for benign transaction, got {result['risk_level']}"
    )


# ── risk level thresholds ─────────────────────────────────────────────────────

def test_risk_level_high_at_and_above_065():
    engine = FraudScoringEngine()
    assert engine._get_risk_level(0.65) == "High"
    assert engine._get_risk_level(0.90) == "High"
    assert engine._get_risk_level(1.00) == "High"


def test_risk_level_medium_between_035_and_065():
    engine = FraudScoringEngine()
    assert engine._get_risk_level(0.35) == "Medium"
    assert engine._get_risk_level(0.50) == "Medium"
    assert engine._get_risk_level(0.64) == "Medium"


def test_risk_level_low_below_035():
    engine = FraudScoringEngine()
    assert engine._get_risk_level(0.00) == "Low"
    assert engine._get_risk_level(0.20) == "Low"
    assert engine._get_risk_level(0.34) == "Low"


# ── feature importance ────────────────────────────────────────────────────────

def test_feature_importance_covers_all_features():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df())
    importance = engine.get_feature_importance()
    for col in FEATURE_COLUMNS:
        assert col in importance, f"Missing feature in importance dict: {col}"


def test_feature_importance_values_sum_to_one():
    engine = FraudScoringEngine()
    engine.train(_synthetic_df())
    importance = engine.get_feature_importance()
    total = sum(importance.values())
    assert abs(total - 1.0) < 1e-6, f"Feature importances don't sum to 1: {total}"
