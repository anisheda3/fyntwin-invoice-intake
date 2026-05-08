# Singleton ERPNext HTTP client
"""
Single reusable ERPNext HTTP client.
ALL ERPNext API calls in this project go through this class.
Config loaded via relative import — nothing hardcoded.
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


class ERPNextClient:
    """
    Reusable async HTTP client for the ERPNext REST API.
    Handles authentication, request building, and error parsing.
    ERPNext does NOT always return clean JSON on failure.
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
        """
        Parse ERPNext response safely.
        Handles: clean JSON, HTML error pages, Frappe error format, plain text.
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

    async def get(
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

    async def post(
        self, doctype: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Create a new document."""
        url = f"/api/resource/{doctype}"
        response = await self._client.post(url, json=data)
        return await self._handle_response(response)

    async def put(
        self, doctype: str, name: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Update an existing document."""
        url = f"/api/resource/{doctype}/{name}"
        response = await self._client.put(url, json=data)
        return await self._handle_response(response)

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