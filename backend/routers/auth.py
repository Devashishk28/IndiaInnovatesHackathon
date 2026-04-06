"""
JWT auth — login / logout.
Uses hashlib PBKDF2 to avoid passlib/bcrypt version conflicts on Python 3.14.
"""
import os
import hashlib
import hmac
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

router  = APIRouter()
bearer  = HTTPBearer(auto_error=False)

JWT_SECRET    = os.getenv("JWT_SECRET", "delhi-aqi-secret-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_H  = 24

SALT = b"delhi-aqi-salt-2024"


def _hash_password(pw: str) -> str:
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), SALT, 100_000)
    return dk.hex()


def _verify_password(pw: str, stored: str) -> bool:
    return hmac.compare_digest(_hash_password(pw), stored)


_USERS = {
    "admin@delhi.gov.in": {
        "password_hash": _hash_password("Admin@123"),
        "role": "admin",
        "name": "Admin User",
    },
    "superadmin@delhi.gov.in": {
        "password_hash": _hash_password("Super@123"),
        "role": "superadmin",
        "name": "Super Administrator",
    },
}


class LoginRequest(BaseModel):
    email:    str
    password: str


def create_token(email: str, role: str) -> str:
    payload = {
        "sub":  email,
        "role": role,
        "exp":  datetime.utcnow() + timedelta(hours=JWT_EXPIRY_H),
        "iat":  datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


def require_admin(token: dict = Depends(verify_token)) -> dict:
    if token.get("role") not in ("admin", "superadmin"):
        raise HTTPException(403, "Admin access required")
    return token


def require_superadmin(token: dict = Depends(verify_token)) -> dict:
    if token.get("role") != "superadmin":
        raise HTTPException(403, "Superadmin access required")
    return token


@router.post("/api/auth/login")
async def login(req: LoginRequest):
    user = _USERS.get(req.email)
    if not user or not _verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(req.email, user["role"])
    return {
        "token": token,
        "email": req.email,
        "role":  user["role"],
        "name":  user["name"],
        "expires_in": JWT_EXPIRY_H * 3600,
    }


@router.post("/api/auth/logout")
async def logout(token: dict = Depends(verify_token)):
    return {"message": "Logged out successfully"}


@router.get("/api/auth/me")
async def me(token: dict = Depends(verify_token)):
    email = token["sub"]
    user  = _USERS.get(email, {})
    return {"email": email, "role": token.get("role"), "name": user.get("name")}
