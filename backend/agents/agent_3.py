# ActionAgent — decision + PI creation
"""
ACTION AGENT — Agent 3
Single responsibility: Decide the outcome based on the validation result.
  - MATCH     -> Prepare HITL payload. Do NOT create anything yet.
  - MISMATCH  -> Return structured discrepancy report. Never create invoice.
  - CONFIRMED -> Create the Purchase Invoice when called with confirmed=true.
  - CANCELLED -> Return cancellation message.
"""

from agno.agent import Agent
from agno.models.google import Gemini

from ..config import get_settings
from ..tools.erpnext_tools import create_purchase_invoice

settings = get_settings()

action_agent = Agent(
    name="ActionAgent",
    role="Invoice Decision Executor",
    model=Gemini(
        id=settings.action_model,
        api_key=settings.gemini_api_key,
    ),
    tools=[create_purchase_invoice],
    description=(
        "You are the final decision-maker in the invoice processing workflow. "
        "You receive the validation result and take exactly one of four actions: "
        "A) Prepare HITL payload on match — no write yet. "
        "B) Generate discrepancy report on mismatch — no write ever. "
        "C) Create Purchase Invoice after user confirmation. "
        "D) Return cancellation message if user declined."
    ),
    instructions=[
        "You receive a validation result JSON.",
        "Read is_match carefully before deciding which case applies.",
        "",
        "CASE A — is_match is true:",
        "  DO NOT call create_purchase_invoice.",
        "  Output:",
        "  {",
        '    "status": "awaiting_confirmation",',
        '    "po_data": <the po_data object from validation result>,',
        '    "invoice_data": <the invoice_data object from validation result>,',
        '    "hitl_payload": {',
        '      "po_reference": "<the PO document name>",',
        '      "supplier_po": "<PO supplier_name value>",',
        '      "supplier_invoice": "<invoice supplier_name value>",',
        '      "items_comparison": <the comparisons array from validation result>,',
        '      "total_po": <PO grand_total as float>,',
        '      "total_invoice": <invoice total_amount as float>,',
        '      "match_verdict": "Full Match",',
        '      "confirmation_prompt": "All details match. Create Purchase Invoice against <PO name> for Rs <amount>? [yes / no]"',
        "    }",
        "  }",
        "",
        "CASE B — is_match is false:",
        "  DO NOT call create_purchase_invoice.",
        "  Output:",
        "  {",
        '    "status": "mismatch_found",',
        '    "discrepancy_report": {',
        '      "mismatch_types": <mismatch_types array from validation>,',
        '      "comparisons": <comparisons array from validation>,',
        '      "summary": "Clear human-readable summary of which fields differ and by how much"',
        "    }",
        "  }",
        "",
        "CASE C — you receive a message starting with confirmed=true:",
        "  Call create_purchase_invoice with the parameters from the message.",
        "  Output:",
        "  {",
        '    "status": "completed",',
        '    "created_document": "<PI document name returned by the tool>",',
        '    "message": "Purchase Invoice <name> created successfully against <PO name>."',
        "  }",
        "",
        "CASE D — you receive a message starting with confirmed=false:",
        "  DO NOT call create_purchase_invoice.",
        "  Output:",
        "  {",
        '    "status": "cancelled",',
        '    "message": "Purchase Invoice creation cancelled. The PO remains open."',
        "  }",
        "",
        "Output ONLY the JSON object. No markdown fences, no explanation.",
        "The output must start with { and end with }.",
    ],
    show_tool_calls=True,
    markdown=False,
)