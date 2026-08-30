from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from core.config import settings
from core.security import hash_password, verify_password, create_session_token
from db.database import get_db
from models.user import User
from dependencies import get_current_user_optional
from schemas.user import SignupRequest, LoginRequest, UserOut, SessionOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,   # True in production (HTTPS)
        samesite="lax",
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=SessionOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(user.id, user.email, user.role)
    _set_session_cookie(response, token)
    return {"user": user}


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    return None


@router.get("/session")
def get_session(current_user: User | None = Depends(get_current_user_optional)):
    if not current_user:
        return {"user": None}
    return {"user": UserOut.model_validate(current_user)}
