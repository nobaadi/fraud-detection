from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

DEFAULT_SQLITE_URL = "sqlite:///./fraud_detection.db"
DATABASE_URL = settings.database_url or DEFAULT_SQLITE_URL


def _build_engine(database_url: str):
    engine_kwargs = {}
    if database_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    return create_engine(database_url, **engine_kwargs)


def _connect_or_fallback(database_url: str):
    engine = _build_engine(database_url)
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return engine
    except Exception:
        if database_url.startswith("sqlite"):
            raise
        fallback_engine = _build_engine(DEFAULT_SQLITE_URL)
        with fallback_engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return fallback_engine


engine = _connect_or_fallback(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
