from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from services.sqlite_reader import (
    get_sessions,
    get_active_sessions,
    get_recent_events,
    get_session,
    get_messages,
    get_session_graph_raw,
    get_token_stats,
    DBDatabaseBusy,
)

router = APIRouter(prefix="/api/v1/sessions", tags=["sessions"])


@router.get("")
def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    source: str | None = None,
):
    """List all sessions, ordered by started_at DESC."""
    try:
        sessions, total = get_sessions(limit=limit, offset=offset, source=source)
        return JSONResponse({"sessions": sessions, "total": total, "limit": limit, "offset": offset})
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/active")
def list_active_sessions():
    """Sessions with no end_reason (currently active)."""
    try:
        sessions = get_active_sessions()
        return {"sessions": sessions}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/events")
def recent_events(limit: int = Query(default=20, ge=1, le=100)):
    """Last N messages across all sessions, newest first."""
    try:
        events = get_recent_events(limit=limit)
        return {"events": events}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/stats")
def session_stats():
    """Aggregate token stats for the current calendar month."""
    try:
        stats = get_token_stats()
        return {"stats": stats}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/{session_id}")
def get_session_detail(session_id: str):
    """Single session detail, or 404."""
    try:
        session = get_session(session_id)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"session": session}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/{session_id}/messages")
def session_messages(session_id: str):
    """All messages for a session, in chronological order."""
    try:
        messages = get_messages(session_id)
        return {"session_id": session_id, "messages": messages, "count": len(messages)}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/{session_id}/graph")
def session_graph(
    session_id: str,
    limit: int = Query(default=200, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Raw messages for building a session graph visualization."""
    try:
        messages = get_session_graph_raw(session_id, limit=limit, offset=offset)
        return {"session_id": session_id, "messages": messages, "count": len(messages)}
    except DBDatabaseBusy as e:
        raise HTTPException(status_code=503, detail=str(e))
