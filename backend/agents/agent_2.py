"""
VALIDATOR AGENT — Agent 2
Single responsibility: Compare extracted invoice data against PO data.

No tools. Receives both invoice and PO data directly in the prompt.
The Python workflow layer fetches the PO from ERPNext and injects it here.
Outputs a structured comparison JSON.
"""

from agno.agent import Agent
from agno.models.google import Gemini

from ..config import get_settings

settings = get_settings()

validator_agent = Agent(
    name="ValidatorAgent",
    role="PO-Invoice Comparator",
    model=Gemini(
        id=settings.validator_model,
        api_key=settings.gemini_api_key,
    ),
    description=(
        "You are a meticulous accounts payable validator. "
        "You receive invoice data and Purchase Order data as JSON, "
        "and compare them field by field. "
        "You output a structured comparison result. "
        "You do NOT fetch data or create anything."
    ),
    instructions=[
        "You receive a JSON with two keys: 'invoice' and 'purchase_order'.",
        "Compare these fields:",
        "",
        "1. Supplier:",
        "   Compare purchase_order.supplier_name with invoice.supplier_name.",
        "   MATCH if one contains the other (case-insensitive).",
        "   MISMATCH type: supplier_mismatch",
        "",
        "2. For each item in invoice.items:",
        "   Find the matching item in purchase_order.items by item_name (partial, case-insensitive).",
        "   Compare qty — tolerance 0.01",
        "   Compare rate — tolerance 0.01",
        "   Compare amount = qty x rate",
        "   MISMATCH types: item_mismatch, quantity_mismatch, rate_mismatch",
        "",
        "3. Grand total:",
        "   Compare purchase_order.grand_total with invoice.total_amount.",
        "   MATCH if absolute difference < 1.0",
        "   MISMATCH type: total_mismatch",
        "",
        "Output this exact JSON:",
        "{",
        '  "is_match": true or false,',
        '  "po_data": <the full purchase_order object you received>,',
        '  "invoice_data": <the full invoice object you received>,',
        '  "comparisons": [',
        '    {"field": "Supplier", "po_value": "...", "invoice_value": "...", "match": true, "difference": null},',
        '    {"field": "Item Name", "po_value": "...", "invoice_value": "...", "match": true, "difference": null},',
        '    {"field": "Quantity", "po_value": 25.0, "invoice_value": 25.0, "match": true, "difference": null},',
        '    {"field": "Rate", "po_value": 5000.0, "invoice_value": 5000.0, "match": true, "difference": null},',
        '    {"field": "Grand Total", "po_value": 125000.0, "invoice_value": 125000.0, "match": true, "difference": null}',
        "  ],",
        '  "discrepancies": [],',
        '  "mismatch_types": []',
        "}",
        "",
        "Set is_match=true ONLY if ALL fields match.",
        "Set is_match=false if ANY field does not match.",
        "difference field: null if match, otherwise a human readable description like 'PO has 25, invoice has 30 (diff: +5)'",
        "Output ONLY the JSON. No markdown. Start with { end with }.",
    ],
    markdown=False,
)