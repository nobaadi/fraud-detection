from pydantic import BaseModel
from typing import Optional, List, Literal, Dict
from datetime import datetime


class TransactionBase(BaseModel):
    transaction_id: str
    user_id: str
    timestamp: datetime
    amount: float
    merchant: str
    merchant_category: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_type: str


class TransactionCreate(TransactionBase):
    pass


class TransactionSignals(BaseModel):
    amount_deviation: Optional[float] = None
    location_deviation: Optional[float] = None
    transaction_velocity: Optional[int] = None
    merchant_novelty: Optional[bool] = None
    device_novelty: Optional[bool] = None


class FraudScore(BaseModel):
    transaction_id: str
    fraud_probability: float
    risk_level: str
    risk_factors: List[str]


class ReviewRequest(BaseModel):
    status: Literal["confirmed_fraud", "false_positive", "clear"]


class TransactionResponse(TransactionBase):
    id: int
    amount_deviation: Optional[float] = None
    location_deviation: Optional[float] = None
    transaction_velocity: Optional[int] = None
    merchant_novelty: Optional[bool] = None
    device_novelty: Optional[bool] = None
    fraud_probability: Optional[float] = None
    risk_level: Optional[str] = None
    risk_factors: Optional[str] = None
    shap_values: Optional[Dict[str, float]] = None
    review_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    records_ingested: int
    processing_status: str


class OverviewStats(BaseModel):
    total_transactions: int
    fraud_alerts_today: int
    average_fraud_score: float
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int


class NetworkNode(BaseModel):
    id: str
    label: str
    type: str  # 'user' or 'merchant'
    risk_level: Optional[str] = None
    transaction_count: int = 0
    transaction_id: Optional[str] = None


class NetworkEdge(BaseModel):
    source: str
    target: str
    weight: float
    transaction_count: int


class NetworkGraph(BaseModel):
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
