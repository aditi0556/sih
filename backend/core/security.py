import time
from passlib.context import CryptContext
from authlib.jose import jwt
from authlib.jose.errors import JoseError

from core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_session_token(user_id: int, email: str, role: str) -> str:
    header = {"alg": settings.JWT_ALGORITHM}
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + settings.JWT_EXPIRE_MINUTES * 60,
    }
    token = jwt.encode(header, payload, settings.JWT_SECRET)
    return token.decode("utf-8")


def decode_session_token(token: str) -> dict | None:
    try:
        claims = jwt.decode(token, settings.JWT_SECRET)
        claims.validate()  # checks exp/iat
        return claims
    except JoseError:
        return None
