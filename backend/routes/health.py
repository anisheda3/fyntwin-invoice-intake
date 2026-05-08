# GET /health | GET /history
"""
Health and history routes.
GET /api/v1/health  — Service status + ERPNext connectivity
GET /api/v1/history — Past sessions via Agno SQLite storage
"""

from datetime import datetime

from fastapi import APIRouter

from ..agents.team import get_session_history
from ..config import get_settings
from ..schemas.models import HealthResponse, HistoryResponse, SessionRecord
from ..services.erpnext_client import ERPNextError, get_erpnext_client

router = APIRouter(prefix="/api/v1", tags=["Health"])
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Service health + ERPNext connectivity check."""
    erpnext_ok = False
    try:
        client = get_erpnext_client()
        await client.get("Purchase Order", filters=None, fields=["name"], limit=1)
        erpnext_ok = True
    except (ERPNextError, Exception):
        erpnext_ok = False

    return HealthResponse(
        service=settings.service_name,
        version=settings.service_version,
        status="healthy" if erpnext_ok else "degraded",
        erpnext_reachable=erpnext_ok,
        timestamp=datetime.utcnow(),
    )


@router.get("/history", response_model=HistoryResponse)
async def get_history() -> HistoryResponse:
    """Past session runs via Agno built-in SQLite storage."""
    sessions_raw = get_session_history()
    sessions = []
    for s in sessions_raw:
        try:
            created_at = (
                datetime.fromisoformat(s["created_at"])
                if s.get("created_at")
                else datetime.utcnow()
            )
            sessions.append(
                SessionRecord(
                    session_id=s["session_id"],
                    prompt=s.get("prompt", ""),
                    status=s.get("status", "unknown"),
                    created_at=created_at,
                    result_summary=s.get("result_summary"),
                )
            )
        except Exception:
            continue

    return HistoryResponse(sessions=sessions, total=len(sessions))