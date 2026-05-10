# IntakeAgent — NLP + RAG
"""
INTAKE AGENT — Agent 1
Single responsibility: Parse natural language invoice descriptions into
structured JSON. No ERPNext calls. No comparison. No decisions.

Uses a RAG knowledge base (LanceDB + GeminiEmbedder) with ERPNext field
schemas and Indian invoice patterns.
"""

import logging

from agno.agent import Agent
from agno.embedder.google import GeminiEmbedder
from agno.models.google import Gemini
from agno.knowledge.text import TextKnowledgeBase
from agno.vectordb.lancedb import LanceDb

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── RAG Knowledge Base ─────────────────────────────────────────────────────
_KB_TEXT = """
## ERPNext Purchase Invoice Required Fields
- supplier: ERPNext supplier document name (string, required)
- posting_date: Date as YYYY-MM-DD (required)
- items: List of line items (required)
  - item_code: ERPNext item code (string)
  - qty: Quantity as float
  - rate: Unit price in INR as float
  - amount: qty x rate as float
- grand_total: Total invoice value as float (INR)

## Indian Number Format Conversion Rules
- Indian format uses commas differently from Western format
- 1,25,000  means 1 lakh 25 thousand = 125000.0
- 5,000     means five thousand       = 5000.0
- 10,00,000 means 10 lakhs            = 1000000.0
- 75,000    means seventy-five thou   = 75000.0
- Always convert to plain float before returning
- The rupee symbol is: Rs or INR or the rupee sign

## Common Invoice Language to Structured Field Mapping
- "25 units of SSD Storage at 5,000 each"
  means item_name=SSD Storage, qty=25.0, rate=5000.0, amount=125000.0
- "against PO-2024-0045" means po_reference=PO-2024-0045
- "from supplier Tech Distributors" means supplier_name=Tech Distributors
- "for 1,25,000" means total_amount=125000.0

## Purchase Order Name Formats in ERPNext
- Always prefixed with PO-
- Format: PO-YYYY-NNNNN (examples: PO-2024-0045, PO-2024-00001)

## Validation Rules
- amount must equal qty x rate (recalculate if not stated)
- total_amount must equal sum of all item amounts
- currency defaults to INR unless explicitly stated otherwise
"""

_embedder = GeminiEmbedder(
    id=settings.embedding_model,
    api_key=settings.gemini_api_key,
)

_knowledge_base = TextKnowledgeBase(
    path="data/rag_knowledge.txt",   # relative path from project root
    vector_db=LanceDb(
        table_name="invoice_intake_kb",
        uri="./data/lancedb",
        embedder=_embedder,
    ),
)

intake_agent = Agent(
    name="IntakeAgent",
    role="Invoice Parser",
    model=Gemini(
        id=settings.intake_model,
        api_key=settings.gemini_api_key,
    ),
    knowledge=_knowledge_base,
    search_knowledge=True,
    description=(
        "You are an expert financial document parser specialising in Indian "
        "supplier invoices. Your ONLY job is to extract structured data from "
        "natural language invoice descriptions. You do NOT validate, compare, "
        "or take any action. You extract and structure — nothing else."
    ),
    instructions=[
        "Search your knowledge base first to understand ERPNext field conventions.",
        "",
        "Extract these fields from the invoice description:",
        "  supplier_name   — supplier name exactly as mentioned in the text",
        "  po_reference    — Purchase Order reference (format: PO-YYYY-NNNNN)",
        "  items           — list of objects with: item_name, qty, rate, amount",
        "  total_amount    — total invoice value as a plain float (no commas, no currency symbols)",
        "  currency        — INR unless explicitly stated otherwise",
        "",
        "CRITICAL — Indian number format conversion:",
        "  1,25,000 = 125000.0  (one lakh twenty-five thousand)",
        "  5,000    = 5000.0    (five thousand)",
        "  Do NOT treat Indian commas like Western thousands separators.",
        "  Always output plain floats with no commas.",
        "",
        "CRITICAL — amount calculation:",
        "  amount = qty x rate for each item",
        "  total_amount = sum of all item amounts",
        "  Recalculate if the stated total does not match.",
        "",
        "Output ONLY a valid JSON object. No markdown fences, no explanation, no extra text.",
        "The output must start with { and end with }.",
        "",
        "Correct output example:",
        '{"supplier_name":"Tech Distributors","po_reference":"PO-2024-0045",',
        '"items":[{"item_name":"SSD Storage","qty":25.0,"rate":5000.0,"amount":125000.0}],',
        '"total_amount":125000.0,"currency":"INR"}',
    ],
    show_tool_calls=True,
    markdown=False,
)


def load_knowledge_base() -> None:
    """Load RAG KB into LanceDB. Call once at startup."""
    try:
        _knowledge_base.load(recreate=False)
        logger.info("IntakeAgent RAG knowledge base loaded successfully.")
    except Exception as e:
        logger.warning("Could not load RAG knowledge base: %s", e)