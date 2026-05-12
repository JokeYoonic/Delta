from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User, TutorConfig
from app.schemas import TutorConfigUpdate, TutorConfigResponse

router = APIRouter(prefix="/tutor", tags=["tutor"])


@router.get("/config", response_model=TutorConfigResponse)
async def get_tutor_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorConfig).where(TutorConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = TutorConfig(user_id=current_user.id)
        db.add(config)
        await db.flush()
        await db.refresh(config)
    return TutorConfigResponse.model_validate(config)


@router.patch("/config", response_model=TutorConfigResponse)
async def update_tutor_config(
    data: TutorConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TutorConfig).where(TutorConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        config = TutorConfig(user_id=current_user.id)
        db.add(config)
        await db.flush()
        await db.refresh(config)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    await db.flush()
    await db.refresh(config)
    return TutorConfigResponse.model_validate(config)
