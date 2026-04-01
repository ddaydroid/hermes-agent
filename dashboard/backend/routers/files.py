import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from services.file_service import list_directory, read_file
from services.git_service import get_git_info
from config import get_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/files", tags=["files"])


@router.get("/tree")
def file_tree(request: Request, path: str = Query(default=str(Path.home()), description="Absolute directory path")):
    """
    List directory contents.

    Returns 200 always with {"path", "entries", [optional "error"]}.
    HTTP status codes:
      - 200: success or error in body
      - 400: path is not a directory (error='not_a_directory')
      - 403: permission denied (error='permission_denied')
    """
    result = list_directory(path)
    if result.get("error") == "not_a_directory":
        raise HTTPException(status_code=400, detail=result["message"])
    elif result.get("error") == "permission_denied":
        raise HTTPException(status_code=403, detail=result["message"])
    return JSONResponse(result)


@router.get("/read")
def file_read(request: Request, path: str = Query(description="Absolute file path")):
    """
    Read file contents.

    Returns 200 with content on success.
    HTTP status codes:
      - 200: success
      - 400: path is a directory (error='is_a_directory')
      - 403: permission denied
      - 404: file too large or binary (returned in body error field)
    """
    result = read_file(path)
    if result.get("error") == "is_a_directory":
        raise HTTPException(status_code=400, detail=result["message"])
    elif result.get("error") == "permission_denied":
        raise HTTPException(status_code=403, detail=result["message"])
    elif result.get("error") in ("file_too_large", "binary_file"):
        raise HTTPException(status_code=404, detail=result["message"])
    return JSONResponse(result)


@router.get("/git")
def file_git(request: Request, workspace: str | None = Query(default=None, description="Absolute path to git repo")):
    """
    Get git info for a workspace.

    Returns 200 always with git status.
    """
    result = get_git_info(workspace or None)
    return JSONResponse(result)

@router.get("/bookmarks")
def file_bookmarks():
    """Get configured bookmarks.

    Returns 200 with {"bookmarks": [{"name": str, "path": str}, ...]}.
    """
    cfg = get_config()
    return {"bookmarks": cfg.bookmarks}
