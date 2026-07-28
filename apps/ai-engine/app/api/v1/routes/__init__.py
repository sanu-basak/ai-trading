from fastapi import APIRouter

from app.api.v1.routes import analysis, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(analysis.router)

__all__ = ["api_router"]
