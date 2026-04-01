"""Git service for workspace context."""
import logging
import subprocess
from pathlib import Path
from typing import Any

from config import get_config

logger = logging.getLogger(__name__)


def get_git_info(workspace_path: str | Path | None = None) -> dict[str, Any]:
    """
    Get git context for a workspace directory.

    Returns:
        {
            "workspace_path": str,
            "is_repo": bool,
            "branch": str | None,
            "status": str | None,      # '' means clean, non-empty means dirty
            "last_commit": {
                "hash": str,
                "message": str,
                "author": str,
                "timestamp": float
            } | None
        }
    """
    try:
        if workspace_path is None:
            workspace_path = get_config().workspace_default

        path = Path(workspace_path).expanduser().resolve()

        # Check if it's a git repo
        result = subprocess.run(
            ['git', '-C', str(path), 'rev-parse', '--is-inside-work-tree'],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            return {
                "workspace_path": str(path),
                "is_repo": False,
                "branch": None,
                "status": None,
                "last_commit": None
            }

        # Get branch name
        branch = None
        result = subprocess.run(
            ['git', '-C', str(path), 'branch', '--show-current'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            branch = result.stdout.strip() or None

        # Get status
        status = ''
        result = subprocess.run(
            ['git', '-C', str(path), 'status', '--porcelain'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            status = result.stdout.strip()

        # Get last commit info
        last_commit = None
        result = subprocess.run(
            ['git', '-C', str(path), 'log', '-1', '--format=%H%n%an <%ae>%n%s'],
            capture_output=True, text=True
        )
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 3:
                commit_hash = lines[0]
                author = lines[1]
                message = '\n'.join(lines[2:])

                # Get timestamp
                timestamp_result = subprocess.run(
                    ['git', '-C', str(path), 'log', '-1', '--format=%ct'],
                    capture_output=True, text=True
                )
                timestamp = float(timestamp_result.stdout.strip()) if timestamp_result.returncode == 0 else 0.0

                last_commit = {
                    "hash": commit_hash,
                    "message": message,
                    "author": author,
                    "timestamp": timestamp
                }

        return {
            "workspace_path": str(path),
            "is_repo": True,
            "branch": branch,
            "status": status,
            "last_commit": last_commit
        }

    except Exception:
        # Never raise exceptions — always return a dict
        logger.warning("git_service: unexpected error for workspace_path=%s", workspace_path, exc_info=True)
        return {
            "workspace_path": str(workspace_path) if workspace_path else str(get_config().workspace_default),
            "is_repo": False,
            "branch": None,
            "status": None,
            "last_commit": None
        }
