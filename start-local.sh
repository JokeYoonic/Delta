#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/app"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     Delta 智学伴 - 一键启动 (无需Docker)     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# --- Backend ---
echo "🔧 [1/4] 设置后端环境..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo "  创建Python虚拟环境..."
    python3 -m venv .venv
fi

source .venv/bin/activate

echo "  安装依赖..."
pip install -e ".[dev]" -q 2>/dev/null

echo "  初始化数据库 (SQLite)..."
python3 -c "
import asyncio
from app.core.database import init_db
asyncio.run(init_db())
print('  数据库初始化完成')
" 2>/dev/null || echo "  数据库将在首次启动时自动创建"

echo "  创建77号超级用户..."
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
            print(f'  ✅ 超级用户 #{settings.SUPER_USER_ID} 已创建')
        else:
            print(f'  ✅ 超级用户 #{settings.SUPER_USER_ID} 已存在')

asyncio.run(seed())
" 2>/dev/null || echo "  超级用户将在首次API调用时创建"

echo ""
echo "🚀 [2/4] 启动后端服务 (http://localhost:8000)..."
cd "$BACKEND_DIR"
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  后端PID: $BACKEND_PID"

# --- Frontend ---
echo ""
echo "🔧 [3/4] 设置前端环境..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "  安装npm依赖..."
    npm install
fi

echo ""
echo "🚀 [4/4] 启动前端服务 (http://localhost:5173)..."
npm run dev &
FRONTEND_PID=$!
echo "  前端PID: $FRONTEND_PID"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║              🎉 启动完成！                    ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  前端: http://localhost:5173                 ║"
echo "║  后端: http://localhost:8000                 ║"
echo "║  API文档: http://localhost:8000/docs         ║"
echo "║                                              ║"
echo "║  👑 77号超级用户登录:                         ║"
echo "║     邮箱: user77@delta.ai                   ║"
echo "║     密码: delta77admin                       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "按 Ctrl+C 停止所有服务"

cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait
