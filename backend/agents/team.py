"""
Agno Team — Coordinate Mode
Orchestrates IntakeAgent -> ValidatorAgent -> ActionAgent sequentially.

WHY COORDINATE MODE:
Tasks are strictly ordered and dependent. Each agent's output feeds the next.
Coordinate mode gives deterministic sequencing with context passing.

ARCHITECTURE NOTE:
Gemini models currently require 'thought signatures' for function/tool calling,
which Agno does not yet support. To maintain a real, working integration,
ERPNext API calls are handled directly in Python (using the sync client)
rather than through agent tools. Each agent still has exactly one job:
- IntakeAgent: NLP parsing
- ValidatorAgent: field-by-field comparison  
- ActionAgent: outcome decision
The Python workflow layer handles all ERP I/O between agent calls.

CONDITIONAL BRANCH:
  is_match=True  -> HITL pause -> return awaiting_confirmation
  is_match=False -> discrepancy report immediately
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
from ..services.erpnext_client import ERPNextError, get_sync_erpnext_client
from .agent_1 import intake_agent
from .agent_2 import validator_agent
from .agent_3 import action_agent

logger = logging.getLogger(__name__)
settings = get_settings()

# Agno Storage
_storage = SqliteStorage(
    table_name="invoice_sessions",
    db_file=settings.agno_storage_path,
)

# In-memory HITL session store
_hitl_sessions: dict[str, dict] = {}

# Agno Team (kept for architecture, actual orchestration done step-by-step)
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
        "A coordinated multi-agent team for Accounts Payable invoice processing."
    ),
    instructions=[
        "Coordinate the 3-agent pipeline: Intake -> Validator -> Action.",
    ],
    markdown=False,
)

# Agent metadata for API responses
_AGENTS_INVOLVED = [
    AgentInfo(
        name="IntakeAgent",
        role="Invoice Parser",
        model=settings.intake_model,
    ),
    AgentInfo(
        name="ValidatorAgent",
        role="PO-Invoice Comparator",
        model=settings.validator_model,
    ),
    AgentInfo(
        name="ActionAgent",
        role="Invoice Decision Executor",
        model=settings.action_model,
    ),
]


def _extract_json(text: str) -> dict:
    if not text:
        return {"status": "error", "message": "Agent returned empty output."}
    text = text.strip()
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


def _fetch_po_from_erp(po_ref: str) -> tuple[dict, Optional[str]]:
    client = get_sync_erpnext_client()
    try:
        po = client.get("Purchase Order", name=po_ref)
        items = []
        for item in po.get("items", []):
            items.append({
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": float(item.get("qty", 0)),
                "rate": float(item.get("rate", 0)),
                "amount": float(item.get("amount", 0)),
                "uom": item.get("uom"),
                "row_name": item.get("name"),
            })
        return {
            "name": po.get("name"),
            "supplier": po.get("supplier"),
            "supplier_name": po.get("supplier_name"),
            "status": po.get("status"),
            "docstatus": po.get("docstatus"),
            "grand_total": float(po.get("grand_total", 0)),
            "net_total": float(po.get("net_total", 0)),
            "currency": po.get("currency", "INR"),
            "items": items,
            "transaction_date": po.get("transaction_date"),
            "company": po.get("company"),
        }, None
    except ERPNextError as e:
        if e.status_code == 404:
            return {}, f"Purchase Order '{po_ref}' not found in ERPNext."
        return {}, f"ERPNext error fetching '{po_ref}': {e.message}"
    except Exception as e:
        return {}, f"Unexpected error fetching PO: {str(e)}"


def _create_pi_in_erp(po_data: dict) -> tuple[Optional[str], Optional[str]]:
    client = get_sync_erpnext_client()
    try:
        pi_items = []
        for item in po_data.get("items", []):
            pi_item = {
                "item_code": item["item_code"],
                "qty": item["qty"],
                "rate": item["rate"],
                "purchase_order": po_data["name"],
            }
            if item.get("row_name"):
                pi_item["purchase_order_item"] = item["row_name"]
            pi_items.append(pi_item)
        payload = {
            "doctype": "Purchase Invoice",
            "supplier": po_data["supplier"],
            "posting_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "items": pi_items,
            "update_stock": 0,
        }
        if po_data.get("company"):
            payload["company"] = po_data["company"]
        result = client.post("Purchase Invoice", payload)
        return result.get("name"), None
    except ERPNextError as e:
        return None, f"Failed to create Purchase Invoice: {e.message}"
    except Exception as e:
        return None, f"Unexpected error creating Purchase Invoice: {str(e)}"


async def run_invoice_workflow(
    prompt: str,
    session_id: Optional[str] = None,
) -> RunResponse:
    sid = session_id or str(uuid.uuid4())
    try:
        logger.info("Session %s: Running IntakeAgent", sid)
        raw_intake = await intake_agent.arun(message=prompt)
        intake_text = raw_intake.content if hasattr(raw_intake, "content") else str(raw_intake)
        invoice = _extract_json(intake_text)
        if "error" in invoice and "supplier_name" not in invoice:
            return RunResponse(session_id=sid, status="error", message=f"IntakeAgent failed: {invoice.get('message','')}", agents_involved=_AGENTS_INVOLVED)
    except Exception as e:
        logger.exception("IntakeAgent error")
        return RunResponse(session_id=sid, status="error", message=str(e), agents_involved=_AGENTS_INVOLVED)

    po_ref = invoice.get("po_reference", "").strip()
    if not po_ref:
        return RunResponse(session_id=sid, status="error", message="No PO reference found.", agents_involved=_AGENTS_INVOLVED)

    logger.info("Session %s: Fetching PO %s", sid, po_ref)
    po_data, po_error = _fetch_po_from_erp(po_ref)
    if po_error:
        return RunResponse(session_id=sid, status="error", message=po_error, agents_involved=_AGENTS_INVOLVED)

    try:
        logger.info("Session %s: Running ValidatorAgent", sid)
        validator_prompt = json.dumps({"invoice": invoice, "purchase_order": po_data}, ensure_ascii=False)
        raw_validator = await validator_agent.arun(message=validator_prompt)
        validator_text = raw_validator.content if hasattr(raw_validator, "content") else str(raw_validator)
        comparison = _extract_json(validator_text)
        if "error" in comparison and "is_match" not in comparison:
            return RunResponse(session_id=sid, status="error", message=f"ValidatorAgent failed: {comparison.get('message','')}", agents_involved=_AGENTS_INVOLVED)
    except Exception as e:
        logger.exception("ValidatorAgent error")
        return RunResponse(session_id=sid, status="error", message=str(e), agents_involved=_AGENTS_INVOLVED)

    try:
        logger.info("Session %s: Running ActionAgent", sid)
        raw_action = await action_agent.arun(message=json.dumps(comparison, ensure_ascii=False))
        action_text = raw_action.content if hasattr(raw_action, "content") else str(raw_action)
        result = _extract_json(action_text)
    except Exception as e:
        logger.exception("ActionAgent error")
        return RunResponse(session_id=sid, status="error", message=str(e), agents_involved=_AGENTS_INVOLVED)

    status = result.get("status", "error")

    if status == "awaiting_confirmation":
        _hitl_sessions[sid] = {
            "prompt": prompt, "po_ref": po_ref, "po_data": po_data,
            "invoice": invoice, "result": result, "status": "awaiting_confirmation",
            "created_at": datetime.utcnow().isoformat(),
        }
        hp = result.get("hitl_payload", {})
        hitl_payload = HITLConfirmationPayload(
            po_reference=hp.get("po_reference", po_ref),
            supplier_po=hp.get("supplier_po", po_data.get("supplier_name", "")),
            supplier_invoice=hp.get("supplier_invoice", invoice.get("supplier_name", "")),
            items_comparison=[ItemComparison(**c) for c in hp.get("items_comparison", comparison.get("comparisons", []))],
            total_po=float(hp.get("total_po", po_data.get("grand_total", 0))),
            total_invoice=float(hp.get("total_invoice", invoice.get("total_amount", 0))),
            match_verdict=hp.get("match_verdict", "Full Match"),
            confirmation_prompt=hp.get("confirmation_prompt", f"All details match. Create Purchase Invoice against {po_ref} for Rs {invoice.get('total_amount', 0):,.0f}? [yes / no]"),
        )
        return RunResponse(session_id=sid, status="awaiting_confirmation", message=hitl_payload.confirmation_prompt, agents_involved=_AGENTS_INVOLVED, result=result, hitl_payload=hitl_payload)

    elif status == "mismatch_found":
        dr = result.get("discrepancy_report", {})
        discrepancy_report = DiscrepancyReport(
            mismatch_types=dr.get("mismatch_types", comparison.get("mismatch_types", [])),
            comparisons=[ItemComparison(**c) for c in dr.get("comparisons", comparison.get("comparisons", []))],
            summary=dr.get("summary", "Discrepancy detected."),
        )
        return RunResponse(session_id=sid, status="completed", message=dr.get("summary", "Discrepancy found."), agents_involved=_AGENTS_INVOLVED, result=result, discrepancy_report=discrepancy_report)

    else:
        return RunResponse(session_id=sid, status="error", message=result.get("message", "Unknown response"), agents_involved=_AGENTS_INVOLVED, result=result)


async def resume_after_confirmation(session_id: str, confirmed: bool) -> ConfirmResponse:
    session = _hitl_sessions.get(session_id)
    if not session:
        return ConfirmResponse(session_id=session_id, status="error", message="Session not found.")
    if session["status"] != "awaiting_confirmation":
        return ConfirmResponse(session_id=session_id, status="error", message=f"Session is {session['status']}.")
    if not confirmed:
        _hitl_sessions[session_id]["status"] = "cancelled"
        return ConfirmResponse(session_id=session_id, status="cancelled", message="Purchase Invoice creation cancelled. The PO remains open.")

    pi_name, error = _create_pi_in_erp(session["po_data"])
    if error:
        _hitl_sessions[session_id]["status"] = "error"
        return ConfirmResponse(session_id=session_id, status="error", message=error)

    _hitl_sessions[session_id]["status"] = "completed"
    return ConfirmResponse(session_id=session_id, status="completed", message=f"Purchase Invoice {pi_name} created.", created_document=pi_name)


def get_session_history() -> list[dict]:
    try:
        sessions = _storage.get_all_sessions()
        result = []
        for s in sessions:
            sid = getattr(s, "session_id", None) or getattr(s, "id", "unknown")
            result.append({
                "session_id": sid,
                "prompt": (getattr(s, "user_data", None) or {}).get("prompt", ""),
                "status": (getattr(s, "status", None) or _hitl_sessions.get(sid, {}).get("status", "unknown")),
                "created_at": (getattr(s, "created_at").isoformat() if getattr(s, "created_at", None) else datetime.utcnow().isoformat()),
                "result_summary": (getattr(s, "agent_data", None) or {}).get("message", ""),
            })
        return result
    except Exception as e:
        logger.warning("Agno storage fallback: %s", e)
        return [{"session_id": sid, "prompt": d.get("prompt",""), "status": d.get("status","unknown"), "created_at": d.get("created_at",""), "result_summary": ""} for sid, d in _hitl_sessions.items()]