from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models import User
from app.services.billing_service import lago_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/customers")
async def create_customer(current_user: User = Depends(get_current_user)):
    customer = await lago_service.create_customer(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
    )
    return customer


@router.post("/subscriptions")
async def create_subscription(
    plan_code: str = "delta-free",
    current_user: User = Depends(get_current_user),
):
    subscription = await lago_service.create_subscription(
        user_id=current_user.id,
        plan_code=plan_code,
    )
    return subscription


@router.post("/events")
async def track_usage(
    event_code: str,
    properties: dict = None,
    current_user: User = Depends(get_current_user),
):
    event = await lago_service.track_usage(
        user_id=current_user.id,
        event_code=event_code,
        properties=properties,
    )
    return event


@router.get("/usage")
async def get_usage(current_user: User = Depends(get_current_user)):
    usage = await lago_service.get_customer_usage(current_user.id)
    return usage


@router.get("/invoices")
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await lago_service.get_customer_invoices(current_user.id)
    return invoices
