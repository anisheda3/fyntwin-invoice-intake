"""
INTAKE AGENT — Agent 1
Single responsibility: Parse natural language invoice descriptions into
structured JSON. No tools, no ERPNext calls, no comparison, no decisions.
"""

import logging

from agno.agent import Agent
from agno.models.google import Gemini

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

intake_agent = Agent(
    name="IntakeAgent",
    role="Invoice Parser",
    model=Gemini(
        id=settings.intake_model,
        api_key=settings.gemini_api_key,
    ),
    description=(
        "You are an expert financial document parser specialising in Indian "
        "supplier invoices. Your ONLY job is to extract structured data from "
        "natural language invoice descriptions into JSON."
    ),
    instructions=[
        "Extract these fields from the invoice description:",
        "  supplier_name   — supplier name exactly as mentioned",
        "  po_reference    — Purchase Order reference (format: PO-YYYY-NNNNN or PUR-ORD-YYYY-NNNNN)",
        "  items           — list of objects: item_name, qty (float), rate (float), amount (float)",
        "  total_amount    — total invoice value as plain float",
        "  currency        — INR unless stated otherwise",
        "",
        "Indian number format rules:",
        "  1,25,000 = 125000.0",
        "  5,000    = 5000.0",
        "  53,200   = 53200.0",
        "  Always output plain floats with no commas or currency symbols.",
        "",
        "amount = qty x rate for each item.",
        "total_amount = sum of all item amounts.",
        "",
        "Output ONLY valid JSON. No markdown. No explanation.",
        "Start with { and end with }.",
        "",
        "Example output:",
        '{"supplier_name":"Tech Distributors","po_reference":"PO-2024-0045",',
        '"items":[{"item_name":"SSD Storage","qty":25.0,"rate":5000.0,"amount":125000.0}],',
        '"total_amount":125000.0,"currency":"INR"}',
    ],
    markdown=False,
)