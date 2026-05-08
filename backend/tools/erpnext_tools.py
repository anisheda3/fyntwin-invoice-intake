# 5 @tool-decorated ERPNext functions
"""
All @tool-decorated ERPNext functions.
Each tool does exactly ONE thing.
No agent logic here — tools are pure ERPNext REST operations.
"""

import logging
from typing import Optional

from agno.tools import tool

from ..services.erpnext_client import ERPNextError, get_erpnext_client

logger = logging.getLogger(__name__)


@tool(
    description=(
        "Fetch a specific Purchase Order from ERPNext by its document name "
        "(e.g. PO-2024-0045). Returns full PO details: supplier, line items, "
        "quantities, rates, and totals."
    )
)
async def fetch_purchase_order(po_name: str) -> dict:
    """
    Fetch a single Purchase Order document from ERPNext.

    Args:
        po_name: ERPNext document name, e.g. PO-2024-0045

    Returns:
        Structured PO data dict, or an error dict.
    """
    client = get_erpnext_client()
    try:
        po = await client.get("Purchase Order", name=po_name)
        items = [
            {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": float(item.get("qty", 0)),
                "rate": float(item.get("rate", 0)),
                "amount": float(item.get("amount", 0)),
                "uom": item.get("uom"),
                "row_name": item.get("name"),
            }
            for item in po.get("items", [])
        ]
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
        }
    except ERPNextError as e:
        if e.status_code == 404:
            return {
                "error": f"Purchase Order '{po_name}' not found in ERPNext.",
                "not_found": True,
            }
        return {
            "error": f"Failed to fetch PO: {e.message}",
            "status_code": e.status_code,
        }
    except Exception as e:
        logger.exception("Unexpected error fetching PO %s", po_name)
        return {"error": str(e)}


@tool(
    description=(
        "List Purchase Orders from ERPNext with optional filters by supplier "
        "or status. Useful when the exact PO name is unknown."
    )
)
async def list_purchase_orders(
    supplier: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 10,
) -> dict:
    """
    Query a list of Purchase Orders from ERPNext.

    Args:
        supplier: Filter by supplier name fragment (optional)
        status: Filter by status e.g. Submitted (optional)
        limit: Max results (default 10)
    """
    client = get_erpnext_client()
    try:
        filters = []
        if supplier:
            filters.append(["supplier", "like", f"%{supplier}%"])
        if status:
            filters.append(["status", "=", status])

        fields = [
            "name", "supplier", "supplier_name",
            "grand_total", "status", "transaction_date",
        ]
        result = await client.get(
            "Purchase Order",
            filters=filters or None,
            fields=fields,
            limit=limit,
        )
        if isinstance(result, list):
            return {"purchase_orders": result, "count": len(result)}
        return {"purchase_orders": [], "count": 0}
    except ERPNextError as e:
        return {"error": f"Failed to list POs: {e.message}"}
    except Exception as e:
        logger.exception("Unexpected error listing POs")
        return {"error": str(e)}


@tool(
    description=(
        "Fetch supplier details from ERPNext by supplier ID or name. "
        "Returns official supplier name and metadata."
    )
)
async def fetch_supplier(supplier_name: str) -> dict:
    """
    Fetch a Supplier document from ERPNext.

    Args:
        supplier_name: ERPNext supplier document name or ID
    """
    client = get_erpnext_client()
    try:
        supplier = await client.get("Supplier", name=supplier_name)
        return {
            "name": supplier.get("name"),
            "supplier_name": supplier.get("supplier_name"),
            "supplier_type": supplier.get("supplier_type"),
            "supplier_group": supplier.get("supplier_group"),
            "country": supplier.get("country"),
        }
    except ERPNextError as e:
        if e.status_code == 404:
            return {
                "error": f"Supplier '{supplier_name}' not found.",
                "not_found": True,
            }
        return {"error": f"Failed to fetch supplier: {e.message}"}
    except Exception as e:
        logger.exception("Unexpected error fetching supplier %s", supplier_name)
        return {"error": str(e)}


@tool(
    description=(
        "Create a Purchase Invoice in ERPNext linked to a specific Purchase Order. "
        "THIS IS A WRITE OPERATION. Only call after explicit HITL user confirmation."
    )
)
async def create_purchase_invoice(
    po_name: str,
    supplier: str,
    items: list[dict],
    posting_date: str,
    company: Optional[str] = None,
) -> dict:
    """
    Create a Purchase Invoice linked to a PO.

    Args:
        po_name: Purchase Order document name
        supplier: Supplier ERPNext ID
        items: List with item_code, qty, rate, row_name (optional)
        posting_date: Invoice date as YYYY-MM-DD
        company: Company name (optional)
    """
    client = get_erpnext_client()
    try:
        pi_items = []
        for item in items:
            pi_item: dict = {
                "item_code": item["item_code"],
                "qty": item["qty"],
                "rate": item["rate"],
                "purchase_order": po_name,
            }
            if item.get("row_name"):
                pi_item["purchase_order_item"] = item["row_name"]
            pi_items.append(pi_item)

        payload: dict = {
            "doctype": "Purchase Invoice",
            "supplier": supplier,
            "posting_date": posting_date,
            "items": pi_items,
            "update_stock": 0,
        }
        if company:
            payload["company"] = company

        result = await client.post("Purchase Invoice", payload)
        return {
            "success": True,
            "purchase_invoice_name": result.get("name"),
            "grand_total": result.get("grand_total"),
            "status": result.get("status"),
            "supplier": result.get("supplier"),
            "message": f"Purchase Invoice {result.get('name')} created successfully.",
        }
    except ERPNextError as e:
        return {
            "success": False,
            "error": f"Failed to create Purchase Invoice: {e.message}",
            "status_code": e.status_code,
        }
    except Exception as e:
        logger.exception("Unexpected error creating Purchase Invoice")
        return {"success": False, "error": str(e)}


@tool(
    description=(
        "Fetch an Item's master details from ERPNext by item code. "
        "Returns item name, description, UOM, and purchase flag."
    )
)
async def fetch_item_details(item_code: str) -> dict:
    """
    Fetch Item master data from ERPNext.

    Args:
        item_code: ERPNext item code
    """
    client = get_erpnext_client()
    try:
        item = await client.get("Item", name=item_code)
        return {
            "item_code": item.get("item_code"),
            "item_name": item.get("item_name"),
            "description": item.get("description"),
            "item_group": item.get("item_group"),
            "stock_uom": item.get("stock_uom"),
            "is_purchase_item": item.get("is_purchase_item", 0),
        }
    except ERPNextError as e:
        if e.status_code == 404:
            return {"error": f"Item '{item_code}' not found.", "not_found": True}
        return {"error": f"Failed to fetch item: {e.message}"}
    except Exception as e:
        logger.exception("Unexpected error fetching item %s", item_code)
        return {"error": str(e)}