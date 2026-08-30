from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from core.config import settings
from core.security import decode_session_token
from db.database import get_db
from models.user import User


from models.driver import Driver


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    claims = decode_session_token(token)
    if not claims:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.query(User).filter(User.id == int(claims["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> User | None:
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        return None
    claims = decode_session_token(token)
    if not claims:
        return None
    return db.query(User).filter(User.id == int(claims["sub"])).first()


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_current_driver(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Driver:
    """Resolves the Driver row linked to the logged-in user.
    If the logged-in user is an admin or tester without a linked driver,
    it falls back to the first driver so the admin can view and inspect the dashboard.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.id).first()
    if not driver:
        if current_user.role == "admin":
            driver = db.query(Driver).first()
        if not driver:
            raise HTTPException(
                status_code=403,
                detail="This account is not linked to a driver profile. Ask an admin to link it.",
            )
    return driver

