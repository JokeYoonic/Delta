from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user, get_current_superuser
from app.core.config import settings
from app.models import User
from app.schemas import UserCreate, UserResponse, TokenResponse, LoginRequest, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    role = settings.SUPER_USER_ROLE if data.email == f"user{settings.SUPER_USER_ID}@delta.ai" else "student"
    user = User(
        id=settings.SUPER_USER_ID if role == settings.SUPER_USER_ROLE else None,
        name=data.name,
        email=data.email,
        hashed_password=get_password_hash(data.password),
        grade=data.grade,
        school=data.school,
        role=role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/logto/url")
async def get_logto_auth_url(redirect_uri: str = Query(...)):
    if not settings.LOGTO_ENABLED:
        raise HTTPException(status_code=400, detail="Logto is not enabled")
    from app.services.logto_service import logto_service
    url = logto_service.get_authorization_url(redirect_uri)
    return {"url": url}


@router.post("/logto/callback")
async def logto_callback(code: str, redirect_uri: str, db: AsyncSession = Depends(get_db)):
    if not settings.LOGTO_ENABLED:
        raise HTTPException(status_code=400, detail="Logto is not enabled")
    from app.services.logto_service import logto_service
    token_data = await logto_service.exchange_code(code, redirect_uri)
    access_token = token_data.get("access_token", "")
    if not access_token:
        raise HTTPException(status_code=401, detail="Logto token exchange failed")

    user_info = await logto_service.get_user_info(access_token)
    logto_sub = user_info.get("sub", "")
    if not logto_sub:
        raise HTTPException(status_code=401, detail="Invalid Logto user info")

    result = await db.execute(select(User).where(User.email == logto_sub))
    user = result.scalar_one_or_none()

    if not user:
        m2m_token = await logto_service.get_m2m_token()
        roles = await logto_service.get_user_roles(logto_sub, m2m_token) if m2m_token else [settings.LOGTO_DEFAULT_ROLE]
        user_role = settings.SUPER_USER_ROLE if is_super_user(logto_sub) else roles[0]
        user = User(
            id=logto_sub,
            name=user_info.get("name", user_info.get("username", "User")),
            email=user_info.get("email", logto_sub),
            hashed_password=get_password_hash("logto-managed"),
            role=user_role,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

    internal_token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=internal_token, user=UserResponse.model_validate(user))


def is_super_user(user_id: str) -> bool:
    return user_id == settings.SUPER_USER_ID


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/seed-superuser")
async def seed_superuser(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == settings.SUPER_USER_ID))
    existing = result.scalar_one_or_none()
    if existing:
        existing.role = settings.SUPER_USER_ROLE
        await db.flush()
        await db.refresh(existing)
        return {"message": f"Super user {settings.SUPER_USER_ID} role updated", "user": UserResponse.model_validate(existing).model_dump()}

    user = User(
        id=settings.SUPER_USER_ID,
        name="Super Admin",
        email=f"user{settings.SUPER_USER_ID}@delta.ai",
        hashed_password=get_password_hash("delta77admin"),
        role=settings.SUPER_USER_ROLE,
        grade="管理员",
        school="Delta HQ",
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "message": f"Super user {settings.SUPER_USER_ID} created",
        "user": UserResponse.model_validate(user).model_dump(),
        "access_token": token,
    }
