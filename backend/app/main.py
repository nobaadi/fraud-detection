from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.config import get_settings
from app.database import engine, Base
from app.routers import transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Safely add new columns to existing tables
    with engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS review_status VARCHAR(32)"
        ))
        conn.commit()
    yield


app = FastAPI(
    title="Fraud Intelligence Platform",
    description="Professional fraud detection and investigation system",
    version="1.0.0",
    lifespan=lifespan,
)


def parse_cors_origins(raw_origins: str) -> list[str]:
    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if origins:
        return origins
    return ["http://localhost:3000", "http://localhost:5173"]


settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Fraud Intelligence Platform"}
