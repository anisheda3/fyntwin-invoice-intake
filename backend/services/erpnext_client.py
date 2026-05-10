# Singleton ERPNext HTTP client
"""
Single reusable ERPNext HTTP client.
Provides BOTH async (for FastAPI routes) and sync (for Agno tools) clients.
Agno's Gemini integration does not correctly await async tool results,
so all @tool functions must be synchronous.
"""

import json as _json
import logging
from typing import Any, Optional

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)


class ERPNextError(Exception):
    """Raised when ERPNext returns an error response."""

    def __init__(self, status_code: int, message: str, raw: str = ""):
        self.status_code = status_code
        self.message = message
        self.raw = raw
        super().__init__(f"ERPNext {status_code}: {message}")


def _parse_response(response: httpx.Response) -> Any:
    """
    Shared response parser for both sync and async clients.
    ERPNext does NOT always return clean JSON on failure.
    """
    raw_text = response.text

    if response.status_code == 200:
        try:
            data = response.json()
            return data.get("data", data)
        except Exception:
            raise ERPNextError(
                200, "Response was 200 but not valid JSON", raw_text
            )

    message = f"HTTP {response.status_code}"
    try:
        err_json = response.json()
        message = (
            err_json.get("message")
            or err_json.get("exception")
            or err_json.get("exc_type")
            or str(err_json)
        )
        if "_server_messages" in err_json:
            try:
                msgs = _json.loads(err_json["_server_messages"])
                if isinstance(msgs, list) and msgs:
                    inner = _json.loads(msgs[0])
                    message = inner.get("message", message)
            except Exception:
                pass
    except Exception:
        message = raw_text[:500] if raw_text else message

    logger.error(
        "ERPNext error %s: %s | raw: %.200s",
        response.status_code,
        message,
        raw_text,
    )
    raise ERPNextError(response.status_code, message, raw_text)


class ERPNextClient:
    """
    Async ERPNext HTTP client — used by FastAPI route handlers only.
    Do NOT use this inside @tool functions.
    """

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.erpnext_base_url.rstrip("/")
        self._auth_header = {
            "Authorization": (
                f"token {settings.erpnext_api_key}:{settings.erpnext_api_secret}"
            ),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self._auth_header,
            timeout=30.0,
        )

    async def _handle_response(self, response: httpx.Response) -> Any:
        return _parse_response(response)

    async def get(
        self,
        doctype: str,
        name: Optional[str] = None,
        filters: Optional[list] = None,
        fields: Optional[list[str]] = None,
        limit: int = 20,
    ) -> Any:
        if name:
            url = f"/api/resource/{doctype}/{name}"
            response = await self._client.get(url)
        else:
            params: dict[str, Any] = {"limit": limit}
            if filters:
                params["filters"] = _json.dumps(filters)
            if fields:
                params["fields"] = _json.dumps(fields)
            url = f"/api/resource/{doctype}"
            response = await self._client.get(url, params=params)
        return await self._handle_response(response)

    async def post(self, doctype: str, data: dict[str, Any]) -> dict[str, Any]:
        url = f"/api/resource/{doctype}"
        response = await self._client.post(url, json=data)
        return await self._handle_response(response)

    async def put(
        self, doctype: str, name: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"/api/resource/{doctype}/{name}"
        response = await self._client.put(url, json=data)
        return await self._handle_response(response)

    async def aclose(self):
        await self._client.aclose()


class SyncERPNextClient:
    """
    SYNCHRONOUS ERPNext HTTP client — used exclusively inside @tool functions.
    Agno's Gemini tool integration does not await coroutines correctly,
    so all tools must be sync. This client uses httpx.Client (blocking).
    """

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.erpnext_base_url.rstrip("/")
        self._auth_header = {
            "Authorization": (
                f"token {settings.erpnext_api_key}:{settings.erpnext_api_secret}"
            ),
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        self._client = httpx.Client(
            base_url=self.base_url,
            headers=self._auth_header,
            timeout=30.0,
        )

    def get(
        self,
        doctype: str,
        name: Optional[str] = None,
        filters: Optional[list] = None,
        fields: Optional[list[str]] = None,
        limit: int = 20,
    ) -> Any:
        """Fetch one document by name or a filtered list."""
        if name:
            url = f"/api/resource/{doctype}/{name}"
            response = self._client.get(url)
        else:
            params: dict[str, Any] = {"limit": limit}
            if filters:
                params["filters"] = _json.dumps(filters)
            if fields:
                params["fields"] = _json.dumps(fields)
            url = f"/api/resource/{doctype}"
            response = self._client.get(url, params=params)
        return _parse_response(response)

    def post(self, doctype: str, data: dict[str, Any]) -> dict[str, Any]:
        """Create a new document."""
        url = f"/api/resource/{doctype}"
        response = self._client.post(url, json=data)
        return _parse_response(response)

    def put(
        self, doctype: str, name: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Update an existing document."""
        url = f"/api/resource/{doctype}/{name}"
        response = self._client.put(url, json=data)
        return _parse_response(response)


# ── Singletons ────────────────────────────────────────────────────────────────

_async_client_instance: Optional[ERPNextClient] = None
_sync_client_instance: Optional[SyncERPNextClient] = None


def get_erpnext_client() -> ERPNextClient:
    """Returns the async client — for FastAPI route handlers only."""
    global _async_client_instance
    if _async_client_instance is None:
        _async_client_instance = ERPNextClient()
    return _async_client_instance


def get_sync_erpnext_client() -> SyncERPNextClient:
    """Returns the sync client — for @tool functions only."""
    global _sync_client_instance
    if _sync_client_instance is None:
        _sync_client_instance = SyncERPNextClient()
    return _sync_client_instance

    async def call_method(
        self, method: str, data: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        """Call a Frappe whitelisted server-side method."""
        url = f"/api/method/{method}"
        response = await self._client.post(url, json=data or {})
        return await self._handle_response(response)

    async def aclose(self):
        await self._client.aclose()


_client_instance: Optional[ERPNextClient] = None


def get_erpnext_client() -> ERPNextClient:
    global _client_instance
    if _client_instance is None:
        _client_instance = ERPNextClient()
    return _client_instance