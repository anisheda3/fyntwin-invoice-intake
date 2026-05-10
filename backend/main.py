# FastAPI app — run from project root
"""
FastAPI application entry point.
IMPORTANT: Run from project ROOT, not from inside backend/
Command: uvicorn backend.main:app --reload --port 8000
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes.agent import router as agent_router
from .routes.health import router as health_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("Starting %s v%s", settings.service_name, settings.service_version)

    # Ensure data directories exist
    os.makedirs("./data", exist_ok=True)
    os.makedirs("./data/lancedb", exist_ok=True)

    # Load RAG knowledge base at startup
    try:
        from .agents.agent_1 import load_knowledge_base
        load_knowledge_base()
    except Exception as e:
        logger.warning("RAG knowledge base load skipped: %s", e)

    yield

    logger.info("Shutting down %s", settings.service_name)


app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description=(
        "Intelligent ERP Automation Assistant — Accounts Payable Module. "
        "Matches supplier invoices against Purchase Orders and creates "
        "Purchase Invoices in ERPNext with human approval."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)
app.include_router(health_router)


@app.get("/")
async def root():
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "docs": "/docs",
        "health": "/api/v1/health",
    }