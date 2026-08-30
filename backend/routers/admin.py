from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from dependencies import require_admin
from schemas.user import UserOut, PromoteRequest

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).order_by(User.id).all()


@router.post("/promote", response_model=UserOut)
def promote_to_admin(
    payload: PromoteRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")
    user.role = "admin"
    db.commit()
    db.refresh(user)
    return user


@router.post("/demote", response_model=UserOut)
def demote_to_user(
    payload: PromoteRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No user with that email")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You can't demote yourself")
    user.role = "user"
    db.commit()
    db.refresh(user)
    return user
