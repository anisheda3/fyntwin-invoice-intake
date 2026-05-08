# POST /run | POST /confirm
"""
Agent routes.
POST /api/v1/run     — Accept invoice prompt, run agent team
POST /api/v1/confirm — Resume a paused HITL session

No agent logic here. Routes are thin: validate, delegate, return.
"""

from fastapi import APIRouter

from ..agents.team import resume_after_confirmation, run_invoice_workflow
from ..schemas.models import ConfirmRequest, ConfirmResponse, RunRequest, RunResponse

router = APIRouter(prefix="/api/v1", tags=["Agent"])


@router.post("/run", response_model=RunResponse)
async def run_agent(request: RunRequest) -> RunResponse:
    """
    Accept a natural language invoice prompt and run the 3-agent team.

    Returns:
    - status=awaiting_confirmation: HITL pause with hitl_payload
    - status=completed with discrepancy_report: mismatch found
    - status=error: pipeline error
    """
    return await run_invoice_workflow(
        prompt=request.prompt,
        session_id=request.session_id,
    )


@router.post("/confirm", response_model=ConfirmResponse)
async def confirm_action(request: ConfirmRequest) -> ConfirmResponse:
    """
    Resume a paused HITL session.

    confirmed=true  -> creates the Purchase Invoice in ERPNext
    confirmed=false -> clean abort, PO remains open
    """
    return await resume_after_confirmation(
        session_id=request.session_id,
        confirmed=request.confirmed,
    )