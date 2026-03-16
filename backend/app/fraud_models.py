import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import pickle
import os

FEATURE_COLUMNS = [
    "amount_deviation",
    "location_deviation",
    "transaction_velocity",
    "merchant_novelty",
    "device_novelty",
    "amount",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models_cache")


def _ensure_model_dir():
    os.makedirs(MODEL_PATH, exist_ok=True)


class FraudScoringEngine:
    """
    Ensemble fraud scoring combining:
    - Isolation Forest (unsupervised anomaly detection)
    - Logistic Regression (supervised, interpretable)
    - Random Forest (supervised, feature importance)
    """

    def __init__(self):
        self.isolation_forest: Optional[IsolationForest] = None
        self.logistic_reg: Optional[Pipeline] = None
        self.random_forest: Optional[RandomForestClassifier] = None
        self.scaler = StandardScaler()
        self._trained = False

    def _extract_features(self, df: pd.DataFrame) -> np.ndarray:
        features = df[FEATURE_COLUMNS].copy()
        features["merchant_novelty"] = features["merchant_novelty"].astype(float)
        features["device_novelty"] = features["device_novelty"].astype(float)
        features = features.fillna(0.0)
        return features.values

    def train(self, df: pd.DataFrame):
        """Train all models on the provided transaction dataframe with engineered features."""
        X = self._extract_features(df)

        # Isolation Forest — unsupervised
        self.isolation_forest = IsolationForest(
            n_estimators=200,
            contamination=0.05,
            random_state=42,
            n_jobs=-1
        )
        self.isolation_forest.fit(X)

        # Generate pseudo-labels from isolation forest for supervised models
        if_scores = self.isolation_forest.decision_function(X)
        # Convert to 0/1 labels: bottom 10% = fraud
        threshold = np.percentile(if_scores, 10)
        pseudo_labels = (if_scores < threshold).astype(int)

        # Logistic Regression
        self.logistic_reg = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=42
            ))
        ])
        self.logistic_reg.fit(X, pseudo_labels)

        # Random Forest
        self.random_forest = RandomForestClassifier(
            n_estimators=200,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
        self.random_forest.fit(X, pseudo_labels)

        self._trained = True
        _ensure_model_dir()
        self._save()

    def _isolation_forest_probability(self, X: np.ndarray) -> np.ndarray:
        """Convert IF decision scores to fraud probabilities [0,1]."""
        raw_scores = self.isolation_forest.decision_function(X)
        # Lower score = more anomalous; invert and normalize
        inverted = -raw_scores
        min_s, max_s = inverted.min(), inverted.max()
        if max_s == min_s:
            return np.zeros(len(X))
        normalized = (inverted - min_s) / (max_s - min_s)
        # Apply sigmoid to emphasize extremes
        return 1 / (1 + np.exp(-8 * (normalized - 0.5)))

    def score(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Score transactions and return fraud probability + risk level."""
        if not self._trained:
            self._train_default(df)

        X = self._extract_features(df)
        if_probs = self._isolation_forest_probability(X)

        lr_probs = self.logistic_reg.predict_proba(X)[:, 1]
        rf_probs = self.random_forest.predict_proba(X)[:, 1]

        # Ensemble: weighted average
        ensemble_probs = 0.35 * if_probs + 0.30 * lr_probs + 0.35 * rf_probs

        results = []
        for i, (_, row) in enumerate(df.iterrows()):
            prob = float(ensemble_probs[i])
            risk_level = self._get_risk_level(prob)
            risk_factors = self._explain(row, prob)
            results.append({
                "transaction_id": row.get("transaction_id", str(i)),
                "fraud_probability": round(prob, 4),
                "risk_level": risk_level,
                "risk_factors": risk_factors,
            })
        return results

    def _get_risk_level(self, probability: float) -> str:
        if probability >= 0.65:
            return "High"
        elif probability >= 0.35:
            return "Medium"
        return "Low"

    def _explain(self, row: pd.Series, fraud_probability: float) -> List[str]:
        """Generate human-readable fraud risk factors."""
        factors = []

        amount_dev = row.get("amount_deviation", 0)
        if abs(amount_dev) > 3:
            multiplier = round(abs(amount_dev), 1)
            factors.append(
                f"Transaction amount is {multiplier}x standard deviations from user's average"
            )
        elif abs(amount_dev) > 2:
            factors.append("Transaction amount significantly above user's historical average")

        loc_dev = row.get("location_deviation", 0)
        if loc_dev > 1000:
            factors.append(
                f"Location anomaly detected ({round(loc_dev)} km from previous transaction)"
            )
        elif loc_dev > 300:
            factors.append(
                f"Unusual location ({round(loc_dev)} km from previous transaction)"
            )

        velocity = row.get("transaction_velocity", 0)
        if velocity >= 5:
            factors.append(
                f"High transaction velocity: {velocity} transactions in the past hour"
            )
        elif velocity >= 3:
            factors.append(
                f"Elevated transaction frequency: {velocity} transactions recently"
            )

        if row.get("merchant_novelty", False):
            factors.append("First transaction with this merchant")

        if row.get("device_novelty", False):
            factors.append("Transaction from a previously unseen device")

        amount = row.get("amount", 0)
        if amount > 5000:
            factors.append(f"High-value transaction: ${amount:,.2f}")

        if not factors and fraud_probability > 0.35:
            factors.append("Combination of unusual signals flagged by anomaly detection")

        return factors

    def retrain_with_reviews(self, df: pd.DataFrame, reviewed_labels: dict):
        """
        Retrain supervised models incorporating analyst review labels as ground truth.
        reviewed_labels: dict of {transaction_id: 1 (fraud) or 0 (not fraud)}
        """
        if not self._trained or self.isolation_forest is None:
            return  # Need initial training first

        X = self._extract_features(df)

        # Generate IF pseudo-labels for all rows
        if_scores = self.isolation_forest.decision_function(X)
        threshold = np.percentile(if_scores, 10)
        labels = (if_scores < threshold).astype(int)

        # Override with human-verified labels (ground truth takes priority)
        for i, (_, row) in enumerate(df.iterrows()):
            tid = str(row.get("transaction_id", ""))
            if tid in reviewed_labels:
                labels[i] = reviewed_labels[tid]

        # Retrain supervised models with improved labels
        self.logistic_reg.fit(X, labels)
        self.random_forest.fit(X, labels)
        self._save()

    def get_feature_importance(self) -> Dict[str, float]:
        if self.random_forest is None:
            return {}
        return dict(zip(FEATURE_COLUMNS, self.random_forest.feature_importances_))

    def _train_default(self, df: pd.DataFrame):
        """Train with available data as a fallback."""
        self.train(df)

    def _save(self):
        with open(os.path.join(MODEL_PATH, "models.pkl"), "wb") as f:
            pickle.dump({
                "isolation_forest": self.isolation_forest,
                "logistic_reg": self.logistic_reg,
                "random_forest": self.random_forest,
                "trained": self._trained,
            }, f)

    def load(self) -> bool:
        path = os.path.join(MODEL_PATH, "models.pkl")
        if not os.path.exists(path):
            return False
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.isolation_forest = data["isolation_forest"]
        self.logistic_reg = data["logistic_reg"]
        self.random_forest = data["random_forest"]
        self._trained = data["trained"]
        return True


# Singleton scoring engine
_engine: Optional[FraudScoringEngine] = None


def get_scoring_engine() -> FraudScoringEngine:
    global _engine
    if _engine is None:
        _engine = FraudScoringEngine()
        _engine.load()
    return _engine
