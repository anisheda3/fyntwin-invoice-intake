# All Pydantic models
"""
All Pydantic request/response models.
No raw dicts in route handlers — every endpoint uses these models.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


# ── Request Models ────────────────────────────────────────────────────────────


class RunRequest(BaseModel):
    prompt: str = Field(
        ...,
        description="Natural language invoice description from the finance user",
        examples=[
            "We received an invoice from supplier Tech Distributors for "
            "Rs 1,25,000 — 25 units of SSD Storage at Rs 5,000 each. "
            "They say it's against PO-2024-0045."
        ],
    )
    session_id: Optional[str] = Field(
        None,
        description="Existing session ID to continue a conversation",
    )


class ConfirmRequest(BaseModel):
    session_id: str = Field(
        ..., description="Session ID returned by the paused /run response"
    )
    confirmed: bool = Field(
        ...,
        description="true to create the Purchase Invoice, false to cancel",
    )


# ── Comparison / Report Models ────────────────────────────────────────────────


class ItemComparison(BaseModel):
    field: str
    po_value: Any
    invoice_value: Any
    match: bool
    difference: Optional[str] = None


class DiscrepancyReport(BaseModel):
    mismatch_types: list[
        Literal[
            "supplier_mismatch",
            "item_mismatch",
            "quantity_mismatch",
            "rate_mismatch",
            "total_mismatch",
        ]
    ]
    comparisons: list[ItemComparison]
    summary: str


class HITLConfirmationPayload(BaseModel):
    po_reference: str
    supplier_po: str
    supplier_invoice: str
    items_comparison: list[ItemComparison]
    total_po: float
    total_invoice: float
    match_verdict: Literal["Full Match", "Partial Match", "Mismatch"]
    confirmation_prompt: str


# ── Response Models ───────────────────────────────────────────────────────────


class AgentInfo(BaseModel):
    name: str
    role: str
    model: str


class RunResponse(BaseModel):
    session_id: str
    status: Literal["completed", "awaiting_confirmation", "error", "cancelled"]
    message: str
    agents_involved: list[AgentInfo] = Field(default_factory=list)
    result: Optional[dict[str, Any]] = None
    hitl_payload: Optional[HITLConfirmationPayload] = None
    discrepancy_report: Optional[DiscrepancyReport] = None
    created_document: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ConfirmResponse(BaseModel):
    session_id: str
    status: Literal["completed", "cancelled", "error"]
    message: str
    created_document: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    service: str
    version: str
    status: Literal["healthy", "degraded", "unhealthy"]
    erpnext_reachable: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SessionRecord(BaseModel):
    session_id: str
    prompt: str
    status: str
    created_at: datetime
    result_summary: Optional[str] = None


class HistoryResponse(BaseModel):
    sessions: list[SessionRecord]
    total: int


# ── Internal Agent Communication Models ──────────────────────────────────────


class ExtractedInvoice(BaseModel):
    """Output contract of the IntakeAgent."""
    supplier_name: str
    po_reference: str
    items: list[dict[str, Any]]
    total_amount: float
    currency: str = "INR"
    raw_input: str


class ValidationResult(BaseModel):
    """Output contract of the ValidatorAgent."""
    is_match: bool
    po_data: dict[str, Any]
    invoice_data: dict[str, Any]
    comparisons: list[ItemComparison]
    discrepancies: list[str]
    mismatch_types: list[str]