import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://sih_user:sih_password@localhost:5432/sih"
    )

    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    SESSION_COOKIE_NAME: str = "sih_session"


settings = Settings()
