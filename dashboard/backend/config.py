"""Dashboard backend configuration. Reads ~/.hermes/dashboard/config.yaml with defaults."""
import os
from pathlib import Path
from typing import Optional

import yaml

DEFAULT_HERMES_HOME = Path.home() / ".hermes"
DEFAULT_DASHBOARD_HOME = Path.home() / ".hermes" / "dashboard"
DEFAULT_WORKSPACE = Path.home() / ".hermes" / "hermes-agent"
DEFAULT_GATEWAY_ADMIN_PORT = 8644
DEFAULT_DASHBOARD_PORT = 8643
DEFAULT_DIR_CACHE_TTL = 30
DEFAULT_DIR_CACHE_MAX_ENTRIES = 200
DEFAULT_FILE_READ_MAX_BYTES = 524_288  # 500 KB


class Config:
    hermes_home: Path
    dashboard_home: Path
    workspace_default: Path
    gateway_admin_port: int
    dashboard_port: int
    dir_cache_ttl: int
    dir_cache_max_entries: int
    file_read_max_bytes: int

    def __init__(self, config_path: Optional[Path] = None):
        if config_path is None:
            config_path = DEFAULT_DASHBOARD_HOME / "config.yaml"

        self._load(config_path)

    def _load(self, config_path: Path):
        defaults = {
            "hermes_home": str(DEFAULT_HERMES_HOME),
            "workspace_default": str(DEFAULT_WORKSPACE),
            "gateway_admin_port": DEFAULT_GATEWAY_ADMIN_PORT,
            "dashboard_port": DEFAULT_DASHBOARD_PORT,
            "dir_cache_ttl": DEFAULT_DIR_CACHE_TTL,
            "dir_cache_max_entries": DEFAULT_DIR_CACHE_MAX_ENTRIES,
            "file_read_max_bytes": DEFAULT_FILE_READ_MAX_BYTES,
            "frontend_origins": ["http://localhost:5173"],
            "dashboard_log_level": "INFO",
        }

        data = dict(defaults)

        if config_path.exists():
            with open(config_path) as f:
                user = yaml.safe_load(f) or {}
            data.update({k: v for k, v in user.items() if v is not None})

        self.hermes_home = Path(data["hermes_home"]).expanduser()
        self.workspace_default = Path(data["workspace_default"]).expanduser()
        self.gateway_admin_port = int(data["gateway_admin_port"])
        self.dashboard_port = int(data["dashboard_port"])
        self.dir_cache_ttl = int(data["dir_cache_ttl"])
        self.dir_cache_max_entries = int(data["dir_cache_max_entries"])
        self.file_read_max_bytes = int(data["file_read_max_bytes"])
        self.frontend_origins = data.get("frontend_origins", ["http://localhost:5173"])
        self.dashboard_log_level = data.get("dashboard_log_level", "INFO")

    def allowed_file_roots(self) -> list[Path]:
        return [self.hermes_home, self.workspace_default]

    def gateway_admin_url(self) -> str:
        return f"http://localhost:{self.gateway_admin_port}"


# Global config instance — imported by other modules
_config: Optional[Config] = None


def get_config() -> Config:
    global _config
    if _config is None:
        _config = Config()
    return _config
