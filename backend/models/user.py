from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime

from db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    # Nullable because Google-only accounts never set a password.
    hashed_password = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    role = Column(String, nullable=False, default="user")  # "user" or "admin"
    created_at = Column(DateTime, default=datetime.utcnow)
