"""SQLite reader for Hermes Dashboard backend.

Connects to ~/.hermes/state.db (WAL mode) and provides read-only query functions.
All functions return plain Python dicts/lists; timestamps are unix floats.
"""

from __future__ import annotations

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from typing import Any

DB_PATH = os.path.expanduser("~/.hermes/state.db")

# Module-level connection — opened once at import time
_conn: sqlite3.Connection | None = None


class DBDatabaseBusy(Exception):
    """Raised when the SQLite database is locked after retry attempts."""
    pass


def _get_conn() -> sqlite3.Connection | None:
    """Open ~/.hermes/state.db with WAL mode, check_same_thread=False, timeout=5.0.

    Returns None if the database cannot be opened (e.g. file missing).
    """
    global _conn
    if _conn is not None:
        return _conn

    if not os.path.exists(DB_PATH):
        return None

    try:
        conn = sqlite3.connect(
            DB_PATH,
            timeout=5.0,
            check_same_thread=False,
        )
        conn.execute("PRAGMA journal_mode=WAL")
        conn.row_factory = sqlite3.Row
        _conn = conn
        return _conn
    except (sqlite3.Error, OSError):
        return None


def _query(
    sql: str,
    params: tuple[Any, ...] | dict[str, Any] = (),
    *,
    retry_on_busy: bool = True,
) -> list[sqlite3.Row]:
    """Execute a read-only query with optional busy-retry logic.

    On "database is locked" errors, retries up to 2 times with 500ms backoff,
    then raises DBDatabaseBusy.
    """
    conn = _get_conn()
    if conn is None:
        return []

    for attempt in range(3):
        try:
            cur = conn.execute(sql, params)
            rows = cur.fetchall()
            return rows
        except sqlite3.OperationalError as exc:
            if retry_on_busy and "database is locked" in str(exc):
                if attempt < 2:
                    time.sleep(0.5)
                    continue
            raise DBDatabaseBusy(str(exc)) from exc

    return []


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    """Convert a sqlite3.Row to a plain dict using column names from description."""
    return dict(row)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_sessions(
    limit: int = 20,
    offset: int = 0,
    source: str | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Return (sessions, total_count) ordered by started_at DESC."""
    if source is not None:
        count_sql = "SELECT COUNT(*) FROM sessions WHERE source = ?"
        rows_sql = """
            SELECT * FROM sessions
            WHERE source = ?
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
        """
        params: tuple[Any, ...] = (source, limit, offset)
        count_params: tuple[Any, ...] = (source,)
    else:
        count_sql = "SELECT COUNT(*) FROM sessions"
        rows_sql = """
            SELECT * FROM sessions
            ORDER BY started_at DESC
            LIMIT ? OFFSET ?
        """
        params = (limit, offset)
        count_params = ()

    rows = _query(rows_sql, params)
    total_row = _query(count_sql, count_params)
    total = total_row[0][0] if total_row else 0

    return [_row_to_dict(r) for r in rows], total


def get_active_sessions() -> list[dict[str, Any]]:
    """Sessions where ended_at IS NULL, ordered by started_at DESC."""
    rows = _query(
        "SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC"
    )
    return [_row_to_dict(r) for r in rows]


def get_recent_events(limit: int = 20) -> list[dict[str, Any]]:
    """Last N messages joined with sessions.

    Returns [{session_id, message_id, role, content, tool_name, timestamp, token_count}].
    """
    rows = _query(
        """
        SELECT
            m.session_id,
            m.id        AS message_id,
            m.role,
            m.content,
            m.tool_name,
            m.timestamp,
            m.token_count
        FROM messages m
        ORDER BY m.timestamp DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [_row_to_dict(r) for r in rows]


def get_session(session_id: str) -> dict[str, Any] | None:
    """Single session by ID, or None."""
    rows = _query("SELECT * FROM sessions WHERE id = ?", (session_id,))
    return _row_to_dict(rows[0]) if rows else None


def get_messages(session_id: str) -> list[dict[str, Any]]:
    """All messages for session_id, in timestamp order. tool_calls JSON-decoded."""
    rows = _query(
        """
        SELECT * FROM messages
        WHERE session_id = ?
        ORDER BY timestamp ASC
        """,
        (session_id,),
    )

    result = []
    for r in rows:
        d = _row_to_dict(r)
        tc = d.get("tool_calls")
        if tc is not None:
            try:
                d["tool_calls"] = json.loads(tc)
            except json.JSONDecodeError:
                d["tool_calls"] = None
        result.append(d)
    return result


def get_session_graph_raw(
    session_id: str,
    limit: int = 200,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Raw messages for graph building. Same as get_messages but paginated."""
    rows = _query(
        """
        SELECT * FROM messages
        WHERE session_id = ?
        ORDER BY timestamp ASC
        LIMIT ? OFFSET ?
        """,
        (session_id, limit, offset),
    )
    return [_row_to_dict(r) for r in rows]


def get_token_stats() -> dict[str, Any]:
    """Aggregate tokens for the current calendar month.

    Returns {
        period, input_tokens, output_tokens, cache_read_tokens,
        cache_write_tokens, reasoning_tokens, estimated_cost_usd, session_count
    }.
    """
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc).timestamp()
    month_end: float | None = None
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc).timestamp()
    else:
        month_end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc).timestamp()

    rows = _query(
        """
        SELECT
            COALESCE(SUM(input_tokens),        0) AS input_tokens,
            COALESCE(SUM(output_tokens),        0) AS output_tokens,
            COALESCE(SUM(cache_read_tokens),    0) AS cache_read_tokens,
            COALESCE(SUM(cache_write_tokens),   0) AS cache_write_tokens,
            COALESCE(SUM(reasoning_tokens),     0) AS reasoning_tokens,
            COALESCE(SUM(estimated_cost_usd),  0.0) AS estimated_cost_usd,
            COUNT(*)                            AS session_count
        FROM sessions
        WHERE started_at >= ? AND started_at < ?
        """,
        (month_start, month_end),
    )

    row = rows[0] if rows else None
    if row is None:
        return {
            "period": f"{now.year}-{now.month:02d}",
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
            "reasoning_tokens": 0,
            "estimated_cost_usd": 0.0,
            "session_count": 0,
        }

    return {
        "period": f"{now.year}-{now.month:02d}",
        "input_tokens": row["input_tokens"],
        "output_tokens": row["output_tokens"],
        "cache_read_tokens": row["cache_read_tokens"],
        "cache_write_tokens": row["cache_write_tokens"],
        "reasoning_tokens": row["reasoning_tokens"],
        "estimated_cost_usd": row["estimated_cost_usd"],
        "session_count": row["session_count"],
    }
