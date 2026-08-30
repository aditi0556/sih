from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from db.database import Base, engine
from routers import auth, admin, dustbins, hotspots, predictions

# Creates tables on startup. Swap for Alembic migrations once the schema stabilizes.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SIH Auth API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,  # required so the browser sends/receives the session cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(dustbins.router)
app.include_router(hotspots.router)
app.include_router(predictions.router)


@app.get("/health")
def health():
    return {"status": "ok"}