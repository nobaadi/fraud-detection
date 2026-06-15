import io
import json
import pandas as pd
import numpy as np
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime

from app.database import get_db
from app.models import Transaction
from app.schemas import (
    UploadResponse, TransactionResponse, FraudScore,
    OverviewStats, NetworkGraph, NetworkNode, NetworkEdge, ReviewRequest
)
from app.feature_engineering import engineer_features_bulk
from app.fraud_models import get_scoring_engine, load_model_metrics

router = APIRouter(prefix="/transactions", tags=["transactions"])

REQUIRED_COLUMNS = {
    "transaction_id", "user_id", "timestamp", "amount",
    "merchant", "merchant_category", "location", "device_type"
}


@router.post("/upload", response_model=UploadResponse)
async def upload_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a CSV of transactions, engineer features, score fraud risk."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {', '.join(missing)}"
        )

    # Keep full upload for optional supervised retraining from real labels.
    full_df = df.copy()

    # Deduplicate against existing records for DB writes.
    existing_ids = {
        row[0] for row in db.query(Transaction.transaction_id).all()
    }
    df = df[~df["transaction_id"].astype(str).isin(existing_ids)]

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["latitude"] = pd.to_numeric(df.get("latitude", pd.Series(np.nan)), errors="coerce")
    df["longitude"] = pd.to_numeric(df.get("longitude", pd.Series(np.nan)), errors="coerce")

    # Engineer features for incoming rows.
    df = engineer_features_bulk(df)

    # If upload contains real labels and metrics are missing, train/retrain now.
    # This allows a second upload of the same file to still generate portfolio metrics.
    engine = get_scoring_engine()
    if "fraud_label" in full_df.columns and load_model_metrics() is None:
        train_df = full_df.copy()
        train_df["timestamp"] = pd.to_datetime(train_df["timestamp"])
        train_df["amount"] = pd.to_numeric(train_df["amount"], errors="coerce").fillna(0.0)
        train_df["latitude"] = pd.to_numeric(train_df.get("latitude", pd.Series(np.nan)), errors="coerce")
        train_df["longitude"] = pd.to_numeric(train_df.get("longitude", pd.Series(np.nan)), errors="coerce")
        train_df = engineer_features_bulk(train_df)
        engine.train(train_df)

    if df.empty:
        return UploadResponse(records_ingested=0, processing_status="All records already exist")

    # Cross-batch correction: fix novelty and location signals using existing DB records
    user_ids_in_batch = df["user_id"].astype(str).unique().tolist()
    existing_txs = (
        db.query(
            Transaction.user_id,
            Transaction.merchant,
            Transaction.device_type,
            Transaction.timestamp,
            Transaction.latitude,
            Transaction.longitude,
        )
        .filter(Transaction.user_id.in_(user_ids_in_batch))
        .order_by(Transaction.user_id, Transaction.timestamp)
        .all()
    )

    existing_merchants = {(e.user_id, e.merchant) for e in existing_txs}
    existing_devices = {(e.user_id, e.device_type) for e in existing_txs}

    # Build per-user last-known location from DB (most recent tx with lat/lon)
    last_known_location: dict = {}
    for e in existing_txs:
        if e.latitude is not None and e.longitude is not None:
            last_known_location[e.user_id] = (e.latitude, e.longitude)

    def fix_row(row):
        uid = str(row["user_id"])
        # Fix merchant novelty
        if (uid, row["merchant"]) in existing_merchants:
            row["merchant_novelty"] = False
        # Fix device novelty
        if (uid, row["device_type"]) in existing_devices:
            row["device_novelty"] = False
        # Fix location deviation for first tx in batch (no prior tx in batch, but has DB history)
        if row["location_deviation"] == 0.0 and uid in last_known_location:
            if not pd.isna(row.get("latitude")) and row.get("latitude") is not None:
                from app.feature_engineering import haversine_distance
                prev_lat, prev_lon = last_known_location[uid]
                row["location_deviation"] = haversine_distance(
                    row["latitude"], row["longitude"], prev_lat, prev_lon
                )
        return row

    if existing_txs:
        df = df.apply(fix_row, axis=1)

    # Train / score
    if not engine._trained:
        engine.train(df)

    scores = engine.score(df)
    score_map = {s["transaction_id"]: s for s in scores}

    # Persist to DB
    records = []
    for _, row in df.iterrows():
        tid = str(row["transaction_id"])
        score = score_map.get(tid, {})
        risk_factors = score.get("risk_factors", [])
        t = Transaction(
            transaction_id=tid,
            user_id=str(row["user_id"]),
            timestamp=row["timestamp"],
            amount=float(row["amount"]),
            merchant=str(row["merchant"]),
            merchant_category=str(row["merchant_category"]),
            location=str(row["location"]),
            latitude=row.get("latitude") if not pd.isna(row.get("latitude", np.nan)) else None,
            longitude=row.get("longitude") if not pd.isna(row.get("longitude", np.nan)) else None,
            device_type=str(row["device_type"]),
            amount_deviation=float(row.get("amount_deviation", 0)),
            location_deviation=float(row.get("location_deviation", 0)),
            transaction_velocity=int(row.get("transaction_velocity", 0)),
            merchant_novelty=bool(row.get("merchant_novelty", False)),
            device_novelty=bool(row.get("device_novelty", False)),
            fraud_probability=score.get("fraud_probability"),
            risk_level=score.get("risk_level"),
            risk_factors=json.dumps(risk_factors),
        )
        records.append(t)

    db.bulk_save_objects(records)
    db.commit()

    return UploadResponse(
        records_ingested=len(records),
        processing_status="completed"
    )


@router.post("/score", response_model=List[FraudScore])
async def score_transactions(
    transaction_ids: Optional[List[str]] = None,
    db: Session = Depends(get_db),
):
    """Re-score specific transactions or all unscored transactions."""
    query = db.query(Transaction)
    if transaction_ids:
        query = query.filter(Transaction.transaction_id.in_(transaction_ids))
    else:
        query = query.filter(Transaction.fraud_probability.is_(None))

    transactions = query.all()
    if not transactions:
        return []

    rows = []
    for t in transactions:
        rows.append({
            "transaction_id": t.transaction_id,
            "amount": t.amount,
            "amount_deviation": t.amount_deviation or 0,
            "location_deviation": t.location_deviation or 0,
            "transaction_velocity": t.transaction_velocity or 0,
            "merchant_novelty": t.merchant_novelty or False,
            "device_novelty": t.device_novelty or False,
        })
    df = pd.DataFrame(rows)

    engine = get_scoring_engine()
    if not engine._trained:
        raise HTTPException(status_code=503, detail="Model not trained yet. Upload data first.")

    scores = engine.score(df)

    results = []
    for score in scores:
        t = db.query(Transaction).filter(
            Transaction.transaction_id == score["transaction_id"]
        ).first()
        if t:
            t.fraud_probability = score["fraud_probability"]
            t.risk_level = score["risk_level"]
            t.risk_factors = json.dumps(score["risk_factors"])
        results.append(FraudScore(
            transaction_id=score["transaction_id"],
            fraud_probability=score["fraud_probability"],
            risk_level=score["risk_level"],
            risk_factors=score["risk_factors"],
        ))
    db.commit()
    return results


@router.get("/alerts", response_model=List[TransactionResponse])
def get_fraud_alerts(
    min_risk: str = Query("Medium", description="Minimum risk level: Low, Medium, High"),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Return transactions sorted by fraud probability."""
    risk_map = {"Low": 0.0, "Medium": 0.35, "High": 0.65}
    min_prob = risk_map.get(min_risk, 0.35)

    transactions = (
        db.query(Transaction)
        .filter(Transaction.fraud_probability >= min_prob)
        .order_by(desc(Transaction.fraud_probability))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return transactions


@router.get("/overview", response_model=OverviewStats)
def get_overview(db: Session = Depends(get_db)):
    """Dashboard overview statistics."""
    total = db.query(Transaction).count()
    alerts_today = (
        db.query(Transaction)
        .filter(Transaction.fraud_probability >= 0.65)
        .count()
    )
    avg_score = db.query(func.avg(Transaction.fraud_probability)).scalar() or 0.0
    high = db.query(Transaction).filter(Transaction.risk_level == "High").count()
    medium = db.query(Transaction).filter(Transaction.risk_level == "Medium").count()
    low = db.query(Transaction).filter(Transaction.risk_level == "Low").count()

    return OverviewStats(
        total_transactions=total,
        fraud_alerts_today=alerts_today,
        average_fraud_score=round(float(avg_score), 4),
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
    )


@router.post("/{transaction_id}/review", response_model=TransactionResponse)
def review_transaction(
    transaction_id: str,
    body: ReviewRequest,
    db: Session = Depends(get_db),
):
    """Mark a transaction as confirmed fraud or false positive, then retrain the model."""
    t = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Update review status (clear removes the label)
    t.review_status = None if body.status == "clear" else body.status
    db.commit()

    # Retrain model with all reviewed labels
    reviewed = db.query(
        Transaction.transaction_id,
        Transaction.review_status,
    ).filter(Transaction.review_status.isnot(None)).all()

    if len(reviewed) >= 3:  # Need minimum reviews to retrain
        label_map = {
            r.transaction_id: (1 if r.review_status == "confirmed_fraud" else 0)
            for r in reviewed
        }
        # Get all scored transactions for retraining
        all_txs = db.query(Transaction).filter(
            Transaction.fraud_probability.isnot(None)
        ).all()

        rows = [{
            "transaction_id": tx.transaction_id,
            "amount": tx.amount,
            "amount_deviation": tx.amount_deviation or 0,
            "location_deviation": tx.location_deviation or 0,
            "transaction_velocity": tx.transaction_velocity or 0,
            "merchant_novelty": tx.merchant_novelty or False,
            "device_novelty": tx.device_novelty or False,
        } for tx in all_txs]

        import pandas as pd
        df = pd.DataFrame(rows)
        engine_obj = get_scoring_engine()
        engine_obj.retrain_with_reviews(df, label_map)

        # Re-score all transactions with updated model
        scores = engine_obj.score(df)
        score_map = {s["transaction_id"]: s for s in scores}
        import json as json_lib
        for tx in all_txs:
            s = score_map.get(tx.transaction_id)
            if s:
                tx.fraud_probability = s["fraud_probability"]
                tx.risk_level = s["risk_level"]
                tx.risk_factors = json_lib.dumps(s["risk_factors"])
        db.commit()
        db.refresh(t)

    return t


@router.get("/activity/summary")
def get_activity_summary(db: Session = Depends(get_db)):
    """Quick summary for live polling."""
    high_risk_count = db.query(Transaction).filter(Transaction.risk_level == "High").count()
    latest = (
        db.query(Transaction)
        .filter(Transaction.risk_level == "High")
        .order_by(desc(Transaction.fraud_probability))
        .first()
    )
    return {
        "high_risk_count": high_risk_count,
        "latest_transaction_id": latest.transaction_id if latest else None,
        "latest_merchant": latest.merchant if latest else None,
        "latest_amount": float(latest.amount) if latest else None,
        "latest_probability": float(latest.fraud_probability) if latest else None,
    }


@router.get("/metrics/model", response_model=Optional[Dict[str, Any]])
def get_model_metrics():
    """Return trained model performance metrics."""
    metrics = load_model_metrics()
    if not metrics:
        raise HTTPException(
            status_code=404,
            detail="Model metrics not available. Upload data to train the model first."
        )
    return metrics


@router.get("/metrics", response_model=Optional[Dict[str, Any]])
def get_model_metrics_alias():
    """Compatibility alias for model metrics endpoint."""
    return get_model_metrics()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Get full transaction detail with risk explanation."""
    t = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return t


@router.get("/{transaction_id}/user-history", response_model=List[TransactionResponse])
def get_user_history(
    transaction_id: str,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    """Return all transactions for the same user."""
    t = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    history = (
        db.query(Transaction)
        .filter(Transaction.user_id == t.user_id)
        .order_by(desc(Transaction.timestamp))
        .limit(limit)
        .all()
    )
    return history


@router.get("/{transaction_id}/merchant-history", response_model=List[TransactionResponse])
def get_merchant_history(
    transaction_id: str,
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    """Return recent transactions at the same merchant."""
    t = db.query(Transaction).filter(
        Transaction.transaction_id == transaction_id
    ).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")

    history = (
        db.query(Transaction)
        .filter(Transaction.merchant == t.merchant)
        .order_by(desc(Transaction.timestamp))
        .limit(limit)
        .all()
    )
    return history


@router.get("/analytics/trends")
def get_trends(db: Session = Depends(get_db)):
    """Fraud trend data for time-series charts."""
    transactions = db.query(
        Transaction.timestamp,
        Transaction.fraud_probability,
        Transaction.risk_level,
        Transaction.merchant,
        Transaction.location,
    ).all()

    if not transactions:
        return {"daily_alerts": [], "probability_distribution": [], "top_merchants": [], "risk_by_location": []}

    df = pd.DataFrame([{
        "date": t.timestamp.date().isoformat() if t.timestamp else None,
        "fraud_probability": t.fraud_probability or 0,
        "risk_level": t.risk_level,
        "merchant": t.merchant,
        "location": t.location,
    } for t in transactions])

    # Daily fraud alerts (High risk)
    daily = (
        df[df["risk_level"] == "High"]
        .groupby("date")
        .size()
        .reset_index(name="count")
        .sort_values("date")
        .to_dict(orient="records")
    )

    # Probability distribution buckets
    bins = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
    labels = ["0-10%", "10-20%", "20-30%", "30-40%", "40-50%",
              "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"]
    df["bucket"] = pd.cut(df["fraud_probability"], bins=bins, labels=labels, include_lowest=True)
    dist = df.groupby("bucket", observed=True).size().reset_index(name="count")
    dist["range"] = dist["bucket"].astype(str)
    prob_dist = dist[["range", "count"]].to_dict(orient="records")

    # Top high-risk merchants
    top_merchants = (
        df[df["risk_level"] == "High"]
        .groupby("merchant")
        .size()
        .reset_index(name="fraud_count")
        .sort_values("fraud_count", ascending=False)
        .head(10)
        .to_dict(orient="records")
    )

    # Risk by location
    location_risk = (
        df.groupby("location")
        .agg(
            avg_risk=("fraud_probability", "mean"),
            transaction_count=("fraud_probability", "count"),
        )
        .reset_index()
        .sort_values("avg_risk", ascending=False)
        .head(15)
        .to_dict(orient="records")
    )

    return {
        "daily_alerts": daily,
        "probability_distribution": prob_dist,
        "top_merchants": top_merchants,
        "risk_by_location": location_risk,
    }


@router.get("/analytics/network", response_model=NetworkGraph)
def get_network(
    min_risk: str = Query("Medium"),
    db: Session = Depends(get_db),
):
    """Build transaction network graph: users connected via merchants."""
    risk_map = {"Low": 0.0, "Medium": 0.35, "High": 0.65}
    min_prob = risk_map.get(min_risk, 0.35)

    transactions = (
        db.query(Transaction)
        .filter(Transaction.fraud_probability >= min_prob)
        .limit(500)
        .all()
    )

    if not transactions:
        return NetworkGraph(nodes=[], edges=[])

    nodes_map: dict = {}
    edges_map: dict = {}

    # Track highest fraud_probability per node to pick the best transaction_id to link to
    node_max_prob: dict = {}

    for t in transactions:
        user_key = f"user_{t.user_id}"
        merchant_key = f"merchant_{t.merchant}"
        t_prob = t.fraud_probability or 0

        if user_key not in nodes_map:
            nodes_map[user_key] = NetworkNode(
                id=user_key,
                label=f"User {t.user_id[:6]}",
                type="user",
                risk_level=t.risk_level,
                transaction_count=0,
                transaction_id=t.transaction_id,
            )
            node_max_prob[user_key] = t_prob
        else:
            if t_prob > node_max_prob[user_key]:
                node_max_prob[user_key] = t_prob
                nodes_map[user_key].transaction_id = t.transaction_id
                nodes_map[user_key].risk_level = t.risk_level
        nodes_map[user_key].transaction_count += 1

        if merchant_key not in nodes_map:
            nodes_map[merchant_key] = NetworkNode(
                id=merchant_key,
                label=t.merchant[:20],
                type="merchant",
                risk_level=t.risk_level,
                transaction_count=0,
                transaction_id=t.transaction_id,
            )
            node_max_prob[merchant_key] = t_prob
        else:
            if t_prob > node_max_prob[merchant_key]:
                node_max_prob[merchant_key] = t_prob
                nodes_map[merchant_key].transaction_id = t.transaction_id
                nodes_map[merchant_key].risk_level = t.risk_level
        nodes_map[merchant_key].transaction_count += 1

        edge_key = f"{user_key}-{merchant_key}"
        if edge_key not in edges_map:
            edges_map[edge_key] = NetworkEdge(
                source=user_key,
                target=merchant_key,
                weight=t.fraud_probability or 0,
                transaction_count=0,
            )
        edges_map[edge_key].transaction_count += 1
        edges_map[edge_key].weight = max(
            edges_map[edge_key].weight, t.fraud_probability or 0
        )

    return NetworkGraph(
        nodes=list(nodes_map.values()),
        edges=list(edges_map.values()),
    )
