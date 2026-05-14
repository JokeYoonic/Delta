from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.models.memory import MemoryBook, MemoryEntry

router = APIRouter(prefix="/memory-books", tags=["memory-books"])


class BookCreate(BaseModel):
    title: str
    description: str = ""
    subject: str = ""
    is_public: bool = False


class BookUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    is_public: Optional[bool] = None


class EntryCreate(BaseModel):
    title: str
    content: str = ""
    knowledge_points: list[str] = []
    source: str = "manual"
    tags: list[str] = []
    order: int = 0


class EntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    knowledge_points: Optional[list[str]] = None
    source: Optional[str] = None
    tags: Optional[list[str]] = None
    order: Optional[int] = None


@router.post("/ensure-default")
async def ensure_default_book(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MemoryBook).where(MemoryBook.user_id == current_user.id).order_by(MemoryBook.updated_at.desc())
    )
    books = result.scalars().all()
    if books:
        book = books[0]
        return {"id": book.id, "title": book.title, "created": False}
    book = MemoryBook(
        user_id=current_user.id,
        title="我的知识笔记",
        description="自动创建的默认知识笔记",
        subject="",
        is_public=False,
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return {"id": book.id, "title": book.title, "created": True}


@router.get("")
async def list_books(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MemoryBook).where(MemoryBook.user_id == current_user.id).order_by(MemoryBook.updated_at.desc())
    )
    books = result.scalars().all()
    return [{"id": b.id, "title": b.title, "description": b.description, "subject": b.subject, "is_public": b.is_public, "created_at": b.created_at.isoformat() if b.created_at else None} for b in books]


@router.post("")
async def create_book(data: BookCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    book = MemoryBook(user_id=current_user.id, title=data.title, description=data.description, subject=data.subject, is_public=data.is_public)
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return {"id": book.id, "title": book.title}


@router.get("/{book_id}/entries")
async def list_entries(book_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    book_result = await db.execute(select(MemoryBook).where(MemoryBook.id == book_id, MemoryBook.user_id == current_user.id))
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    result = await db.execute(select(MemoryEntry).where(MemoryEntry.book_id == book_id).order_by(MemoryEntry.order, MemoryEntry.created_at))
    entries = result.scalars().all()
    return [{"id": e.id, "title": e.title, "content": e.content, "knowledge_points": e.knowledge_points, "source": e.source, "tags": e.tags, "order": e.order} for e in entries]


@router.post("/{book_id}/entries")
async def create_entry(book_id: str, data: EntryCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    book_result = await db.execute(select(MemoryBook).where(MemoryBook.id == book_id, MemoryBook.user_id == current_user.id))
    book = book_result.scalar_one_or_none()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    entry = MemoryEntry(
        book_id=book_id, title=data.title, content=data.content,
        knowledge_points=data.knowledge_points, source=data.source,
        tags=data.tags, order=data.order,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return {"id": entry.id, "title": entry.title}


@router.delete("/{book_id}/entries/{entry_id}")
async def delete_entry(book_id: str, entry_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MemoryEntry).where(MemoryEntry.id == entry_id, MemoryEntry.book_id == book_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)
    return {"deleted": True}
