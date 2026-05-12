#!/bin/bash
set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Delta AI Tutor Backend Startup (v0.2.0) ==="

if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo "[1/5] Creating virtual environment..."
    cd "$BACKEND_DIR"
    python3 -m venv .venv
    source .venv/bin/activate
    echo "[2/5] Installing dependencies..."
    pip install -e ".[dev,quality]"
else
    echo "[1/5] Virtual environment found."
    source "$BACKEND_DIR/.venv/bin/activate"
    echo "[2/5] Checking dependencies..."
    pip install -e "$BACKEND_DIR[dev,quality]" -q
fi

echo "[3/5] Running database migrations..."
cd "$BACKEND_DIR"
alembic upgrade head 2>/dev/null || echo "  No migrations found, skipping..."

echo "[4/5] Seeding super user #77..."
cd "$BACKEND_DIR"
python3 -c "
import asyncio
from app.core.database import async_session
from app.core.security import get_password_hash
from app.models import User
from app.core.config import settings
from sqlalchemy import select

async def seed():
    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == settings.SUPER_USER_ID))
        if not result.scalar_one_or_none():
            user = User(
                id=settings.SUPER_USER_ID,
                name='Super Admin',
                email=f'user{settings.SUPER_USER_ID}@delta.ai',
                hashed_password=get_password_hash('delta77admin'),
                role=settings.SUPER_USER_ROLE,
                grade='管理员',
                school='Delta HQ',
            )
            db.add(user)
            await db.commit()
            print(f'  Super user #{settings.SUPER_USER_ID} created (email: user{settings.SUPER_USER_ID}@delta.ai, password: delta77admin)')
        else:
            print(f'  Super user #{settings.SUPER_USER_ID} already exists')

asyncio.run(seed())
" 2>/dev/null || echo "  Seed failed (DB not ready yet, will be created on first request)"

echo "[5/5] Starting server..."
cd "$BACKEND_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
