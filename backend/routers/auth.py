import secrets
from typing import cast
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from core.config import settings
from core.security import create_session_token
from db.database import get_db
from models.user import User
from models.driver import Driver
from dependencies import get_current_user_optional
from schemas.user import SignupRequest, LoginRequest, UserOut, SessionOut

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

# Short-lived cookie used only to verify the OAuth "state" round-trip (CSRF protection).
OAUTH_STATE_COOKIE_NAME = "sih_oauth_state"


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


def _create_driver_for_user(db: Session, user: User) -> Driver:
    """Every account is also a driver profile — created once, right alongside the user."""
    driver = Driver(
        name=user.name,
        phone=None,
        status="AVAILABLE",
        truck_id=None,
        user_id=user.id,
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=payload.password,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _create_driver_for_user(db, user)

    return user


@router.post("/login", response_model=SessionOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or user.hashed_password != payload.password:

        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(cast(int, user.id), cast(str, user.email), cast(str, user.role))
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


@router.get("/google/login")
def google_login():
    """Redirects the browser to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on the server")

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    google_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

    response = RedirectResponse(url=google_url)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=600,  # 10 minutes is plenty to complete the round trip
        path="/",
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Google redirects here after the user approves/denies access."""
    if error:
        raise HTTPException(status_code=400, detail=f"Google sign-in was cancelled or failed: {error}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state from Google")

    cookie_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code with Google")
        access_token = token_res.json().get("access_token")

        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google profile")
        profile = userinfo_res.json()

    google_id = profile.get("sub")
    email = profile.get("email")
    name = profile.get("name") or (email.split("@")[0] if email else "Google User")

    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Google account is missing required profile info")

    # Match on google_id first, then fall back to email (links an existing
    # password account to Google if the email already exists).
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    is_new_user = False
    if user:
        if not user.google_id:
            user.google_id = google_id
            db.commit()
            db.refresh(user)
    else:
        user = User(
            name=name,
            email=email,
            hashed_password=None,
            google_id=google_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True

    if is_new_user:
        _create_driver_for_user(db, user)
    else:
        # Backfill: accounts created before driver auto-creation existed won't
        # have a linked driver yet — give them one on their next Google login.
        existing_driver = db.query(Driver).filter(Driver.user_id == user.id).first()
        if not existing_driver:
            _create_driver_for_user(db, user)

    token = create_session_token(cast(int, user.id), cast(str, user.email), cast(str, user.role))
    redirect_response = RedirectResponse(url=f"{settings.FRONTEND_ORIGIN}/dashboard")
    _set_session_cookie(redirect_response, token)
    redirect_response.delete_cookie(OAUTH_STATE_COOKIE_NAME, path="/")
    return redirect_response