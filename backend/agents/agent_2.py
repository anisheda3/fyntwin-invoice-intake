# ValidatorAgent — PO fetch + comparison
"""
VALIDATOR AGENT — Agent 2
Single responsibility: Fetch the referenced Purchase Order from ERPNext
and compare it field-by-field against the extracted invoice data.
Produces a structured comparison result. No parsing. No creation.
"""

from agno.agent import Agent
from agno.models.google import Gemini

from ..config import get_settings
from ..tools.erpnext_tools import (
    fetch_item_details,
    fetch_purchase_order,
    fetch_supplier,
    list_purchase_orders,
)

settings = get_settings()

validator_agent = Agent(
    name="ValidatorAgent",
    role="PO-Invoice Comparator",
    model=Gemini(
        id=settings.validator_model,
        api_key=settings.gemini_api_key,
    ),
    tools=[
        fetch_purchase_order,
        list_purchase_orders,
        fetch_supplier,
        fetch_item_details,
    ],
    description=(
        "You are a meticulous accounts payable validator. "
        "Your ONLY job is to fetch a Purchase Order from ERPNext and compare it "
        "against extracted invoice data — field by field. "
        "You produce a structured comparison report. You do NOT create anything."
    ),
    instructions=[
        "You receive extracted invoice JSON from the IntakeAgent.",
        "",
        "STEP 1 — Fetch the PO:",
        "  Call fetch_purchase_order with po_name set to the po_reference value from the invoice.",
        "  If the PO is not found, return:",
        '  {"is_match": false, "error": "PO not found", "po_data": {}, "invoice_data": <input>, "comparisons": [], "discrepancies": ["PO not found in ERPNext"], "mismatch_types": ["item_mismatch"]}',
        "  If docstatus is not 1, set is_match=false and add PO_NOT_SUBMITTED to discrepancies.",
        "",
        "STEP 2 — Compare these fields:",
        "  a) Supplier:",
        "     Compare PO supplier_name with invoice supplier_name (case-insensitive, partial match).",
        "     MATCH if one string contains the other.",
        "     MISMATCH type: supplier_mismatch",
        "",
        "  b) Items (for each item in the invoice):",
        "     Find matching PO item by item_name (partial match, case-insensitive).",
        "     Compare qty — tolerance 0.01.",
        "     Compare rate — tolerance 0.01.",
        "     Compare amount = qty x rate.",
        "     MISMATCH types: item_mismatch, quantity_mismatch, rate_mismatch",
        "",
        "  c) Grand total:",
        "     Compare PO grand_total with invoice total_amount.",
        "     MATCH if absolute difference is less than 1.0.",
        "     MISMATCH type: total_mismatch",
        "",
        "STEP 3 — Output this exact JSON structure:",
        "{",
        '  "is_match": true or false,',
        '  "po_data": <full object returned by fetch_purchase_order>,',
        '  "invoice_data": <the invoice JSON you received>,',
        '  "comparisons": [',
        '    {"field": "Supplier", "po_value": "...", "invoice_value": "...", "match": true or false, "difference": null or "description"},',
        '    {"field": "Item Name", "po_value": "...", "invoice_value": "...", "match": true or false, "difference": null},',
        '    {"field": "Quantity", "po_value": 25.0, "invoice_value": 25.0, "match": true, "difference": null},',
        '    {"field": "Rate", "po_value": 5000.0, "invoice_value": 5000.0, "match": true, "difference": null},',
        '    {"field": "Grand Total", "po_value": 125000.0, "invoice_value": 125000.0, "match": true, "difference": null}',
        "  ],",
        '  "discrepancies": ["Human-readable description of each mismatch"],',
        '  "mismatch_types": ["supplier_mismatch", "quantity_mismatch"]',
        "}",
        "",
        "Set is_match=true ONLY if ALL fields match.",
        "Output ONLY the JSON object. No markdown. The output must start with { and end with }.",
    ],
    show_tool_calls=True,
    markdown=False,
)