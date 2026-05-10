# Agno Team (Coordinate) + workflow + history
"""
Agno Team — Coordinate Mode
Orchestrates IntakeAgent -> ValidatorAgent -> ActionAgent sequentially.

WHY COORDINATE MODE:
Tasks are strictly ordered and dependent. Coordinate mode gives deterministic
sequencing with a team leader managing context. Route mode only picks ONE agent.
Collaborate mode is too free-form for financial compliance.

CONDITIONAL BRANCH (in run_invoice_workflow):
  IF is_match == True  -> HITL pause -> awaiting_confirmation
  IF is_match == False -> discrepancy report immediately
"""

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Optional

from agno.models.google import Gemini
from agno.storage.sqlite import SqliteStorage
from agno.team import Team

from ..config import get_settings
from ..schemas.models import (
    AgentInfo,
    ConfirmResponse,
    DiscrepancyReport,
    HITLConfirmationPayload,
    ItemComparison,
    RunResponse,
)
from .agent_1 import intake_agent
from .agent_2 import validator_agent
from .agent_3 import action_agent

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Agno Storage (SQLite) ──────────────────────────────────────────────────
_storage = SqliteStorage(
    table_name="invoice_sessions",
    db_file=settings.agno_storage_path,
)

# ── In-memory HITL session store ──────────────────────────────────────────
_hitl_sessions: dict[str, dict] = {}

# ── Agno Team ─────────────────────────────────────────────────────────────
invoice_team = Team(
    name="InvoiceIntakeTeam",
    mode="coordinate",
    model=Gemini(
        id=settings.intake_model,
        api_key=settings.gemini_api_key,
    ),
    members=[intake_agent, validator_agent, action_agent],
    storage=_storage,
    description=(
        "A coordinated multi-agent team for Accounts Payable invoice processing. "
        "Processes supplier invoices, validates them against Purchase Orders, "
        "and creates Purchase Invoices only after explicit human approval."
    ),
    instructions=[
        "You coordinate a strict 3-agent pipeline for invoice processing.",
        "Step 1: Send the user raw invoice description to IntakeAgent and get structured JSON back.",
        "Step 2: Send IntakeAgent JSON output to ValidatorAgent and get comparison result JSON back.",
        "Step 3: Send ValidatorAgent JSON output to ActionAgent and get the final decision JSON back.",
        "Pass context faithfully between agents without modification.",
        "Return ActionAgent final JSON as your response.",
        "Do not add any text outside the JSON returned by ActionAgent.",
    ],
    show_tool_calls=True,
    markdown=False,
)

_AGENTS_INVOLVED = [
    AgentInfo(name="IntakeAgent", role="Invoice Parser", model=settings.intake_model),
    AgentInfo(name="ValidatorAgent", role="PO-Invoice Comparator", model=settings.validator_model),
    AgentInfo(name="ActionAgent", role="Invoice Decision Executor", model=settings.action_model),
]


def _extract_json(text: str) -> dict:
    """
    Safely extract JSON from agent output.
    Handles markdown fences and surrounding text that Gemini sometimes adds.
    """
    if not text:
        return {"status": "error", "message": "Agent returned empty output."}

    text = text.strip()

    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.error("Could not extract JSON from agent output: %.300s", text)
    return {
        "status": "error",
        "message": f"Agent returned non-JSON output: {text[:200]}",
    }


async def run_invoice_workflow(
    prompt: str,
    session_id: Optional[str] = None,
) -> RunResponse:
    sid = session_id or str(uuid.uuid4())
    try:
        response = await invoice_team.arun(message=prompt, session_id=sid)
        raw_output = response.content if hasattr(response, "content") else str(response)
        result = _extract_json(raw_output)
        status = result.get("status", "error")

        if status == "awaiting_confirmation":
            _hitl_sessions[sid] = {
                "prompt": prompt,
                "result": result,
                "po_data": result.get("po_data", {}),
                "invoice_data": result.get("invoice_data", {}),
                "status": "awaiting_confirmation",
                "created_at": datetime.utcnow().isoformat(),
            }

            hp = result.get("hitl_payload", {})
            hitl_payload = None
            try:
                hitl_payload = HITLConfirmationPayload(
                    po_reference=hp.get("po_reference", ""),
                    supplier_po=hp.get("supplier_po", ""),
                    supplier_invoice=hp.get("supplier_invoice", ""),
                    items_comparison=[
                        ItemComparison(**c) for c in hp.get("items_comparison", [])
                    ],
                    total_po=float(hp.get("total_po", 0)),
                    total_invoice=float(hp.get("total_invoice", 0)),
                    match_verdict=hp.get("match_verdict", "Full Match"),
                    confirmation_prompt=hp.get("confirmation_prompt", ""),
                )
            except Exception as e:
                logger.warning("Could not parse HITL payload: %s", e)

            return RunResponse(
                session_id=sid,
                status="awaiting_confirmation",
                message=hp.get(
                    "confirmation_prompt",
                    "All details match. Please confirm to create the Purchase Invoice.",
                ),
                agents_involved=_AGENTS_INVOLVED,
                result=result,
                hitl_payload=hitl_payload,
            )

        elif status == "mismatch_found":
            dr = result.get("discrepancy_report", {})
            discrepancy_report = None
            try:
                discrepancy_report = DiscrepancyReport(
                    mismatch_types=dr.get("mismatch_types", []),
                    comparisons=[
                        ItemComparison(**c) for c in dr.get("comparisons", [])
                    ],
                    summary=dr.get("summary", "Discrepancy detected."),
                )
            except Exception as e:
                logger.warning("Could not parse discrepancy report: %s", e)

            return RunResponse(
                session_id=sid,
                status="error",
                message=dr.get("summary", "Discrepancy detected."),
                agents_involved=_AGENTS_INVOLVED,
                result=result,
                discrepancy_report=discrepancy_report,
            )

        elif status == "completed":
            return RunResponse(
                session_id=sid,
                status="completed",
                message=result.get("message", "Invoice processing completed."),
                agents_involved=_AGENTS_INVOLVED,
                result=result,
            )

        else:
            return RunResponse(
                session_id=sid,
                status="error",
                message=result.get("message", "Unexpected workflow status."),
                agents_involved=_AGENTS_INVOLVED,
                result=result,
            )
    except Exception as e:
        logger.exception("Error running invoice workflow for session %s", sid)
        return RunResponse(
            session_id=sid,
            status="error",
            message=f"Error running invoice workflow: {str(e)}",
            agents_involved=_AGENTS_INVOLVED,
        )


async def resume_after_confirmation(session_id: str, confirmed: bool) -> ConfirmResponse:
    session = _hitl_sessions.get(session_id)

    if not session:
        return ConfirmResponse(
            session_id=session_id,
            status="error",
            message=f"Session '{session_id}' not found or already completed.",
        )

    if session.get("status") != "awaiting_confirmation":
        return ConfirmResponse(
            session_id=session_id,
            status="error",
            message=f"Session is in state '{session.get('status')}', not awaiting confirmation.",
        )

    if not confirmed:
        _hitl_sessions[session_id]["status"] = "cancelled"
        return ConfirmResponse(
            session_id=session_id,
            status="cancelled",
            message="Purchase Invoice creation cancelled. The PO remains open.",
        )

    try:
        po_data = session.get("po_data", {})
        hitl_payload = session.get("result", {}).get("hitl_payload", {})

        confirm_prompt = (
            f"confirmed=true. "
            f"Create Purchase Invoice for PO: {hitl_payload.get('po_reference')}. "
            f"Supplier: {po_data.get('supplier')}. "
            f"Items: {json.dumps(po_data.get('items', []))}. "
            f"Company: {po_data.get('company', '')}. "
            f"Posting date: {datetime.utcnow().strftime('%Y-%m-%d')}.")

        response = await action_agent.arun(message=confirm_prompt)
        raw_output = (
            response.content if hasattr(response, "content") else str(response)
        )
        logger.info("ActionAgent confirm output: %.200s", raw_output)
        action_result = _extract_json(raw_output)
        final_status = action_result.get("status", "completed")
        _hitl_sessions[session_id]["status"] = final_status

        return ConfirmResponse(
            session_id=session_id,
            status=final_status,
            message=action_result.get(
                "message", "Purchase Invoice created successfully."
            ),
            created_document=action_result.get("created_document"),
        )
    except Exception as e:
        logger.exception("Error resuming session %s", session_id)
        _hitl_sessions[session_id]["status"] = "error"
        return ConfirmResponse(
            session_id=session_id,
            status="error",
            message=f"Error creating Purchase Invoice: {str(e)}",
        )


def get_session_history() -> list[dict]:
    """
    Retrieve past sessions from Agno built-in SQLite storage.
    Falls back to in-memory store if Agno storage is unavailable.
    """
    try:
        sessions = _storage.get_all_sessions()
        result = []
        for s in sessions:
            session_id = getattr(s, "session_id", None) or getattr(s, "id", "unknown")
            user_data = getattr(s, "user_data", None) or {}
            agent_data = getattr(s, "agent_data", None) or {}
            created_at = getattr(s, "created_at", None)
            status = getattr(s, "status", None)

            result.append({
                "session_id": session_id,
                "prompt": user_data.get("prompt", ""),
                "status": status or _hitl_sessions.get(session_id, {}).get("status", "unknown"),
                "created_at": (
                    created_at.isoformat() if created_at else datetime.utcnow().isoformat()
                ),
                "result_summary": agent_data.get("message", ""),
            })
        return result

    except Exception as e:
        logger.warning("Agno storage unavailable, using memory fallback: %s", e)
        return [
            {
                "session_id": sid,
                "prompt": data.get("prompt", ""),
                "status": data.get("status", "unknown"),
                "created_at": data.get("created_at", datetime.utcnow().isoformat()),
                "result_summary": data.get("result", {}).get("message", ""),
            }
            for sid, data in _hitl_sessions.items()
        ]