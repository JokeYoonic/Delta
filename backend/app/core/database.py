from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

_is_sqlite = settings.effective_database_url.startswith("sqlite")

if _is_sqlite:
    engine = create_async_engine(
        settings.effective_database_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        settings.effective_database_url,
        echo=False,
        pool_size=20,
        max_overflow=10,
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    if not _is_sqlite:
        async with engine.connect() as conn:
            try:
                await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
                await conn.commit()
            except Exception:
                await conn.rollback()
            try:
                await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "vector"'))
                await conn.commit()
            except Exception:
                await conn.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
