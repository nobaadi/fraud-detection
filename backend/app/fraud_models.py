import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import pickle
import os
import json

FEATURE_COLUMNS = [
    "amount_deviation",
    "location_deviation",
    "transaction_velocity",
    "merchant_novelty",
    "device_novelty",
    "amount",
]

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models_cache")
METRICS_PATH = os.path.join(os.path.dirname(__file__), "models_cache", "model_metrics.json")


def _ensure_model_dir():
    """Ensure models cache directory exists."""
    os.makedirs(MODEL_PATH, exist_ok=True)


def load_model_metrics() -> Optional[Dict[str, Any]]:
    """Load computed model metrics from file."""
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading metrics: {e}")
    return None


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

        # Check for real fraud labels
        has_real_labels = "fraud_label" in df.columns
        if has_real_labels:
            y = df["fraud_label"].astype(int).values
            print(f"Training with {len(y)} real fraud labels. Fraud rate: {y.mean():.2%}")
        else:
            # Fallback: generate pseudo-labels
            self.isolation_forest = IsolationForest(
                n_estimators=200,
                contamination=0.05,
                random_state=42,
                n_jobs=-1
            )
            self.isolation_forest.fit(X)
            if_scores = self.isolation_forest.decision_function(X)
            threshold = np.percentile(if_scores, 10)
            y = (if_scores < threshold).astype(int)
            print(f"Training with pseudo-labels from Isolation Forest. Fraud rate: {y.mean():.2%}")

        # Isolation Forest — unsupervised (always trained for feature extraction)
        if not has_real_labels or self.isolation_forest is None:
            self.isolation_forest = IsolationForest(
                n_estimators=200,
                contamination=0.05,
                random_state=42,
                n_jobs=-1
            )
            self.isolation_forest.fit(X)

        # Logistic Regression
        self.logistic_reg = Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(
                class_weight="balanced",
                max_iter=1000,
                random_state=42
            ))
        ])
        self.logistic_reg.fit(X, y)

        # Random Forest
        self.random_forest = RandomForestClassifier(
            n_estimators=200,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        )
        self.random_forest.fit(X, y)

        self._trained = True

        # Compute and save metrics if real labels available
        if has_real_labels:
            self._compute_and_save_metrics(X, y)

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

    def _compute_and_save_metrics(self, X: np.ndarray, y_true: np.ndarray):
        """Compute classification metrics and save to JSON file."""
        if self.logistic_reg is None or self.random_forest is None:
            return

        # Get predictions from ensemble
        if_probs = self._isolation_forest_probability(X)
        lr_probs = self.logistic_reg.predict_proba(X)[:, 1]
        rf_probs = self.random_forest.predict_proba(X)[:, 1]
        ensemble_probs = 0.35 * if_probs + 0.30 * lr_probs + 0.35 * rf_probs
        
        # Binary predictions (threshold 0.5)
        y_pred = (ensemble_probs >= 0.5).astype(int)
        
        # Compute metrics
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        
        # ROC-AUC (on probabilities)
        try:
            roc_auc = roc_auc_score(y_true, ensemble_probs)
        except:
            roc_auc = 0.0
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        metrics = {
            "timestamp": pd.Timestamp.now().isoformat(),
            "dataset_size": len(y_true),
            "fraud_count": int(y_true.sum()),
            "fraud_rate": float(y_true.mean()),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "confusion_matrix": {
                "true_negatives": int(tn),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "true_positives": int(tp),
            },
            "model_weights": {
                "isolation_forest": 0.35,
                "logistic_regression": 0.30,
                "random_forest": 0.35,
            }
        }
        
        # Save metrics to file
        _ensure_model_dir()
        with open(METRICS_PATH, "w") as f:
            json.dump(metrics, f, indent=2)
        
        print(f"\n✓ Model Metrics Saved:")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall: {recall:.4f}")
        print(f"  F1 Score: {f1:.4f}")
        print(f"  ROC-AUC: {roc_auc:.4f}")
        print(f"  True Positives: {tp}, False Positives: {fp}")
        print(f"  False Negatives: {fn}, True Negatives: {tn}")

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
