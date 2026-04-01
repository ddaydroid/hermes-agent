import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from services.gateway_proxy import get_live_agents, GatewayUnavailable

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("/live")
def live_agents(request: Request):
    """
    Fetch running agents from the gateway admin endpoint.
    
    Returns 200 with agent state when gateway is running.
    Returns 503 when gateway admin endpoint is unreachable.
    """
    try:
        data = get_live_agents()
        return JSONResponse(data)
    except GatewayUnavailable as e:
        logger.error("Gateway unavailable — endpoint=%s error=%s", request.url.path, e)
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/status")
def agents_status(request: Request):
    """
    Simple gateway status check (does NOT raise on gateway down).
    
    Returns:
      - 200: {"gateway_available": true, "agents_count": N, "uptime_seconds": ...}
      - 200: {"gateway_available": false, "agents_count": 0, "uptime_seconds": null}
    """
    try:
        data = get_live_agents()
        return {
            "gateway_available": True,
            "agents_count": len(data.get("agents", [])),
            "uptime_seconds": data.get("gateway_uptime_seconds"),
            "subagent_budget_total": data.get("subagent_budget_total"),
            "subagent_budget_remaining": data.get("subagent_budget_remaining"),
        }
    except GatewayUnavailable:
        return {
            "gateway_available": False,
            "agents_count": 0,
            "uptime_seconds": None,
            "subagent_budget_total": None,
            "subagent_budget_remaining": None,
        }
