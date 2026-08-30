from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from core.config import settings

from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
fallback_db_path = backend_dir / "sih.db"

db_url = settings.DATABASE_URL
connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True if not db_url.startswith("sqlite") else False
    )
    # Quick connectivity check if using postgres
    if not db_url.startswith("sqlite"):
        with engine.connect() as test_conn:
            pass
except Exception as e:
    sqlite_url = f"sqlite:///{fallback_db_path.as_posix()}"
    print(f"[DATABASE] Notice: Could not connect to {db_url} ({e}). Falling back to local SQLite database ({sqlite_url})...")
    db_url = sqlite_url
    connect_args = {"check_same_thread": False}
    engine = create_engine(db_url, connect_args=connect_args)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
