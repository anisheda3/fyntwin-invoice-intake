"""
ACTION AGENT — Agent 3
Single responsibility: Decide the outcome based on the validation result.

No tools. Receives comparison JSON, outputs decision JSON.
The Python workflow layer handles actual ERPNext writes.

CASE A — is_match true  -> return awaiting_confirmation with HITL payload
CASE B — is_match false -> return mismatch_found with discrepancy report
"""

from agno.agent import Agent
from agno.models.google import Gemini

from ..config import get_settings

settings = get_settings()

action_agent = Agent(
    name="ActionAgent",
    role="Invoice Decision Executor",
    model=Gemini(
        id=settings.action_model,
        api_key=settings.gemini_api_key,
    ),
    description=(
        "You are the final decision-maker in the invoice processing workflow. "
        "You receive a validation comparison result and decide the outcome. "
        "You do NOT create invoices or call any external systems. "
        "You output a structured JSON decision."
    ),
    instructions=[
        "You receive a validation result JSON with is_match, po_data, invoice_data, comparisons, discrepancies, mismatch_types.",
        "",
        "CASE A — is_match is true:",
        "Output:",
        "{",
        '  "status": "awaiting_confirmation",',
        '  "hitl_payload": {',
        '    "po_reference": "<po_data.name>",',
        '    "supplier_po": "<po_data.supplier_name>",',
        '    "supplier_invoice": "<invoice_data.supplier_name>",',
        '    "items_comparison": <the comparisons array>,',
        '    "total_po": <po_data.grand_total as float>,',
        '    "total_invoice": <invoice_data.total_amount as float>,',
        '    "match_verdict": "Full Match",',
        '    "confirmation_prompt": "All details match. Create Purchase Invoice against <PO name> for Rs <amount>? [yes / no]"',
        "  }",
        "}",
        "",
        "CASE B — is_match is false:",
        "Output:",
        "{",
        '  "status": "mismatch_found",',
        '  "discrepancy_report": {',
        '    "mismatch_types": <mismatch_types from input>,',
        '    "comparisons": <comparisons from input>,',
        '    "summary": "Clear description of exactly what does not match and by how much"',
        "  }",
        "}",
        "",
        "Output ONLY the JSON. No markdown. Start with { end with }.",
    ],
    markdown=False,
)