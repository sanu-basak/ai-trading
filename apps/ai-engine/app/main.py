"""FastAPI application entry point for the DEVQUANTIC AI Engine."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.routes import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger("app.main")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "AI-powered technical analysis service. Produces explainable "
            "BUY / SELL / NO_TRADE / WATCH signals. Analysis only — not investment advice."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/health", tags=["health"])
    def root_health() -> dict:
        return {"status": "ok", "service": settings.app_name, "version": __version__}

    @app.get("/", tags=["health"])
    def root() -> dict:
        return {
            "service": settings.app_name,
            "version": __version__,
            "docs": "/docs",
            "api": settings.api_prefix,
        }

    logger.info("AI engine initialized", extra={"env": settings.environment})
    return app


app = create_app()
