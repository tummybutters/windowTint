#!/usr/bin/env python3
"""Small guarded Google Ads REST v24 client.

Search is always available. Mutations are disabled unless the caller constructs
the client with ``allow_mutation=True`` after its own explicit authorization
checks. Error and evidence helpers deliberately remove credentials, raw request
IDs, and bearer tokens.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

import requests


API_VERSION = "v24"
ADS_SCOPE = "https://www.googleapis.com/auth/adwords"
SENSITIVE_KEYS = {
    "access_token",
    "authorization",
    "client_secret",
    "developer_token",
    "developer-token",
    "refresh_token",
    "request_id",
    "request-id",
}


class GoogleAdsRestError(RuntimeError):
    """Raised for a redacted Google Ads REST failure."""


class MutationBlocked(GoogleAdsRestError):
    """Raised when a read-only client is asked to mutate."""


def load_env(path: Path) -> dict[str, str]:
    """Load a simple dotenv file, with process environment taking precedence."""
    values: dict[str, str] = {}
    if path.is_file():
        for raw in path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    values.update(os.environ)
    return values


def access_token(env: dict[str, str]) -> str:
    """Return an Ads-scoped token using service-account or refresh-token auth."""
    key_path = env.get("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
    if key_path:
        try:
            from google.auth.transport.requests import Request as GoogleAuthRequest
            from google.oauth2 import service_account

            credentials = service_account.Credentials.from_service_account_file(
                key_path,
                scopes=[ADS_SCOPE],
            )
            credentials.refresh(GoogleAuthRequest())
            if credentials.token:
                return credentials.token
        except Exception as exc:  # pragma: no cover - exercised only with live auth
            raise GoogleAdsRestError("Google Ads service-account authentication failed") from exc

    required = ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN")
    missing = [key for key in required if not env.get(key)]
    if missing:
        raise GoogleAdsRestError("Missing Google Ads authentication configuration: " + ", ".join(missing))
    response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": env["GOOGLE_OAUTH_CLIENT_ID"],
            "client_secret": env["GOOGLE_OAUTH_CLIENT_SECRET"],
            "refresh_token": env["GOOGLE_ADS_REFRESH_TOKEN"],
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if response.status_code >= 400:
        raise GoogleAdsRestError(f"Google OAuth refresh failed ({response.status_code})")
    token = response.json().get("access_token", "")
    if not token:
        raise GoogleAdsRestError("Google OAuth refresh returned no access token")
    return token


def _redact_text(value: str) -> str:
    text = re.sub(r"(?i)Bearer\s+[A-Za-z0-9._~+\-/=]+", "Bearer [REDACTED]", value)
    text = re.sub(
        r"(?i)(access_token|refresh_token|client_secret|developer[-_]?token|request[-_]?id)"
        r"([\"'\s:=]+)[A-Za-z0-9._~+\-/=]+",
        r"\1\2[REDACTED]",
        text,
    )
    return text[:2_000]


def redact_for_evidence(value: Any) -> Any:
    """Recursively redact secrets, raw API errors, and raw request IDs."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        request_values = {
            str(item)
            for key, item in value.items()
            if key.casefold().replace("-", "_") == "request_id" and item
        }
        for key, item in value.items():
            normalized = key.casefold().replace("-", "_")
            if normalized in {name.replace("-", "_") for name in SENSITIVE_KEYS}:
                out[key] = "[REDACTED]"
                continue
            redacted = redact_for_evidence(item)
            if isinstance(redacted, str):
                for request_id in request_values:
                    redacted = redacted.replace(request_id, "[REDACTED]")
            out[key] = redacted
        return out
    if isinstance(value, list):
        return [redact_for_evidence(item) for item in value]
    if isinstance(value, tuple):
        return [redact_for_evidence(item) for item in value]
    if isinstance(value, str):
        return _redact_text(value)
    return value


def request_id_digest(request_id: str | None) -> str | None:
    """Preserve request correlation without storing the raw Google request ID."""
    if not request_id:
        return None
    return hashlib.sha256(request_id.encode("utf-8")).hexdigest()


class GoogleAdsRestClient:
    """Minimal Google Ads REST client with a hard mutation capability gate."""

    def __init__(
        self,
        *,
        customer_id: str,
        developer_token: str,
        access_token: str,
        login_customer_id: str,
        allow_mutation: bool = False,
        api_version: str = API_VERSION,
        session: Any = requests,
    ) -> None:
        self.customer_id = customer_id.replace("-", "")
        self.allow_mutation = allow_mutation
        self.api_version = api_version
        self.session = session
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "developer-token": developer_token,
            "login-customer-id": login_customer_id.replace("-", ""),
            "Content-Type": "application/json",
        }

    @property
    def base_url(self) -> str:
        return f"https://googleads.googleapis.com/{self.api_version}/customers/{self.customer_id}"

    def search(self, query: str) -> list[dict[str, Any]]:
        """Run one read-only GAQL searchStream request and flatten its rows."""
        response = self.session.post(
            f"{self.base_url}/googleAds:searchStream",
            headers=self.headers,
            json={"query": query},
            timeout=120,
        )
        if response.status_code >= 400:
            raise GoogleAdsRestError(
                f"Google Ads GAQL failed ({response.status_code}): {_redact_text(response.text)}"
            )
        payload = response.json() if response.text.strip() else []
        return [row for chunk in payload for row in chunk.get("results", [])]

    def mutate(self, service: str, operations: list[dict[str, Any]]) -> dict[str, Any]:
        """Mutate one service only when explicit mutation capability was granted."""
        if not self.allow_mutation:
            raise MutationBlocked("Google Ads client is read-only; mutation permission was not granted")
        if not operations:
            return {"skipped": True, "reason": "already at target", "results": []}
        if service == "googleAds":
            payload = {
                "mutateOperations": operations,
                "partialFailure": False,
                "responseContentType": "RESOURCE_NAME_ONLY",
            }
        else:
            payload = {
                "operations": operations,
                "partialFailure": False,
                "responseContentType": "RESOURCE_NAME_ONLY",
            }
        response = self.session.post(
            f"{self.base_url}/{service}:mutate",
            headers=self.headers,
            json=payload,
            timeout=180,
        )
        if response.status_code >= 400:
            raise GoogleAdsRestError(
                f"Google Ads {service} mutation failed ({response.status_code}): {_redact_text(response.text)}"
            )
        data = response.json() if response.text.strip() else {}
        results = data.get("mutateOperationResponses", data.get("results", []))
        normalized_results: list[dict[str, Any]] = []
        for result in results:
            if "resourceName" in result:
                normalized_results.append({"resourceName": result["resourceName"]})
                continue
            resources = [
                nested.get("result", {}).get("resourceName")
                for nested in result.values()
                if isinstance(nested, dict)
            ]
            resource = next((item for item in resources if item), None)
            normalized_results.append({"resourceName": resource} if resource else {})
        return {
            "http_status": response.status_code,
            "request_id": response.headers.get("request-id"),
            "results": normalized_results,
        }


def build_client_from_env(
    env: dict[str, str],
    *,
    customer_id: str,
    allow_mutation: bool,
) -> GoogleAdsRestClient:
    configured = env.get("GOOGLE_ADS_CUSTOMER_ID", "").replace("-", "")
    if configured != customer_id:
        raise GoogleAdsRestError(
            f"Configured Google Ads customer {configured or '[missing]'} is outside guarded scope"
        )
    return GoogleAdsRestClient(
        customer_id=customer_id,
        developer_token=env["GOOGLE_ADS_DEVELOPER_TOKEN"],
        access_token=access_token(env),
        login_customer_id=env["GOOGLE_ADS_LOGIN_CUSTOMER_ID"],
        allow_mutation=allow_mutation,
    )
