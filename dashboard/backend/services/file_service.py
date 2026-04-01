"""File service for Hermes Dashboard backend.

Provides directory listing and file reading with proper error handling.
Uses config for max file size limits.
"""
import os
from pathlib import Path

from config import get_config

# Language detection map for highlight.js
LANG_MAP = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "jsx",
    ".json": "json",
    ".md": "markdown",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".css": "css",
    ".html": "html",
    ".htm": "html",
    ".txt": "plaintext",
    ".log": "plaintext",
    ".toml": "toml",
    ".ini": "ini",
    ".cfg": "ini",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".sql": "sql",
    ".xml": "xml",
    ".graphql": "graphql",
}


def _assert_within_root(path: Path) -> None:
    """Verify path is within allowed_file_paths (recursive). Raises PermissionError if not."""
    cfg = get_config()
    if not cfg.is_path_allowed(path):
        raise PermissionError(f"Path {path} is outside allowed file paths: {cfg.allowed_file_paths}")


def _error(error_code: str, message: str) -> dict:
    """Create an error response dict."""
    return {"error": error_code, "message": message}


def list_directory(path: str | Path) -> dict:
    """List contents of a directory.

    Returns:
        {
            "path": str,
            "entries": [
                {
                    "name": str,
                    "path": str,
                    "type": "file" | "dir" | "symlink",
                    "size": int | None,
                    "modified": float | None,
                    "symlink_target": str | None
                },
                ...
            ]
        }

    Errors:
        - "not_a_directory" if path exists but is a file
        - "permission_denied" if cannot read directory
    """
    path = Path(path)
    try:
        _assert_within_root(path)
    except PermissionError as e:
        return _error("permission_denied", str(e))

    # Check if path exists
    if not path.exists():
        return _error("not_a_directory", f"Path does not exist: {path}")

    # Check if it's a directory
    if not path.is_dir():
        return _error("not_a_directory", f"Path is not a directory: {path}")

    # Try to list directory
    try:
        entries = []
        with os.scandir(path) as scan:
            for entry in scan:
                entry_type: Literal["file", "dir", "symlink"]
                symlink_target = None

                if entry.is_symlink():
                    entry_type = "symlink"
                    symlink_target = os.readlink(entry.path)
                elif entry.is_dir():
                    entry_type = "dir"
                else:
                    entry_type = "file"

                # Get size and modified time only for files
                size: int | None = None
                modified: float | None = None
                if entry_type == "file":
                    try:
                        stat = entry.stat()
                        size = stat.st_size
                        modified = stat.st_mtime
                    except OSError:
                        pass

                entries.append({
                    "name": entry.name,
                    "path": entry.path,
                    "type": entry_type,
                    "size": size,
                    "modified": modified,
                    "symlink_target": symlink_target,
                })
    except PermissionError:
        return _error("permission_denied", f"Permission denied: {path}")
    except OSError as e:
        return _error("permission_denied", f"Cannot read directory {path}: {e}")

    return {
        "path": str(path),
        "entries": entries,
    }


def _is_binary(file_path: Path, sample_size: int = 8192) -> bool:
    """Check if a file appears to be binary.

    Reads first `sample_size` bytes and counts null bytes.
    If >10% are null bytes, considers it binary.
    """
    try:
        with open(file_path, "rb") as f:
            sample = f.read(sample_size)
    except OSError:
        return True  # Treat unreadable files as binary

    if not sample:
        return False

    null_count = sample.count(b"\x00")
    null_ratio = null_count / len(sample)
    return null_ratio > 0.10


def read_file(path: str | Path) -> dict:
    """Read a file's contents.

    Returns:
        {
            "path": str,
            "content": str,
            "size": int,
            "modified": float | None,
            "encoding": str,
            "language": str | None
        }

    Errors:
        - "is_a_directory" if path is a directory
        - "permission_denied" if cannot read file
        - "file_too_large" if file > file_read_max_bytes
        - "binary_file" if file appears to be binary
    """
    path = Path(path)
    try:
        _assert_within_root(path)
    except PermissionError as e:
        return _error("permission_denied", str(e))
    config = get_config()

    # Check if path exists
    if not path.exists():
        return _error("permission_denied", f"File does not exist: {path}")

    # Check if it's a file
    if path.is_dir():
        return _error("is_a_directory", f"Path is a directory: {path}")

    # Get file size
    try:
        size = path.stat().st_size
    except OSError as e:
        return _error("permission_denied", f"Cannot stat file {path}: {e}")

    # Check size limit
    if size > config.file_read_max_bytes:
        return _error(
            "file_too_large",
            f"File size {size} exceeds limit {config.file_read_max_bytes}"
        )

    # Check if binary
    if _is_binary(path):
        return _error("binary_file", f"File appears to be binary: {path}")

    # Read file content
    try:
        # Use errors="replace" to handle malformed UTF-8
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except PermissionError:
        return _error("permission_denied", f"Permission denied: {path}")
    except OSError as e:
        return _error("permission_denied", f"Cannot read file {path}: {e}")

    # Get modified time
    try:
        modified = path.stat().st_mtime
    except OSError:
        modified = None

    # Detect language from extension
    language = LANG_MAP.get(path.suffix.lower())

    return {
        "path": str(path),
        "content": content,
        "size": size,
        "modified": modified,
        "encoding": "utf-8",
        "language": language,
    }
