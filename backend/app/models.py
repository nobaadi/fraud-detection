from sqlalchemy import Column, String, Float, DateTime, Integer, Text, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    merchant = Column(String(256), nullable=False, index=True)
    merchant_category = Column(String(128), nullable=False)
    location = Column(String(256), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    device_type = Column(String(64), nullable=False)

    # Derived fraud signals
    amount_deviation = Column(Float, nullable=True)
    location_deviation = Column(Float, nullable=True)
    transaction_velocity = Column(Integer, nullable=True)
    merchant_novelty = Column(Boolean, nullable=True)
    device_novelty = Column(Boolean, nullable=True)

    # Fraud scoring
    fraud_probability = Column(Float, nullable=True)
    risk_level = Column(String(16), nullable=True)
    risk_factors = Column(Text, nullable=True)
    review_status = Column(String(32), nullable=True)  # 'confirmed_fraud' | 'false_positive' | None

    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_transactions_user_timestamp", "user_id", "timestamp"),
    )
