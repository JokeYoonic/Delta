from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
import bcrypt
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if isinstance(plain_password, str):
        plain_password = plain_password.encode("utf-8")
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode("utf-8")
    return bcrypt.checkpw(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    if isinstance(password, str):
        password = password.encode("utf-8")
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def is_super_user(user_id: str) -> bool:
    return user_id == settings.SUPER_USER_ID


async def get_current_user(db: AsyncSession = Depends(get_db)):
    """开发阶段：跳过鉴权，始终返回超级管理员。"""
    from app.models import User
    result = await db.execute(select(User).where(User.id == settings.SUPER_USER_ID))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        id=settings.SUPER_USER_ID,
        name="Super Admin",
        email="user77@delta.ai",
        hashed_password=get_password_hash("delta77admin"),
        role=settings.SUPER_USER_ROLE,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_current_superuser(current_user=Depends(get_current_user)):
    return current_user
