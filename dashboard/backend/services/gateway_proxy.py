import httpx
from typing import Any

DEFAULT_TIMEOUT = 5.0  # seconds

GATEWAY_URL = "http://localhost:8644/internal/agents/live"


class GatewayUnavailable(Exception):
    """Raised when the gateway admin endpoint cannot be reached."""
    pass


def get_live_agents() -> dict[str, Any]:
    """
    Fetch running agents from the gateway admin endpoint.

    Returns:
        {
            "agents": [...],
            "gateway_uptime_seconds": float,
            "gateway_started_at": float | None,
            "max_concurrent_agents": int,
            "subagent_budget_total": int,
            "subagent_budget_remaining": int
        }

    Raises:
        GatewayUnavailable: if the connection fails or returns non-200
    """
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT) as client:
            resp = client.get(GATEWAY_URL)
            if resp.status_code != 200:
                raise GatewayUnavailable(f"Gateway returned {resp.status_code}")
            return resp.json()
    except (httpx.ConnectError, httpx.TimeoutException) as e:
        raise GatewayUnavailable("Gateway admin endpoint unreachable") from e
