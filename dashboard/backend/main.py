"""FastAPI application — Hermes Dashboard Backend."""
import logging
from logging.handlers import RotatingFileHandler
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from config import get_config
from routers import files, agents, sessions


def _setup_logging(level: str) -> None:
    """Configure file + console logging with rotation."""
    hermes_home = get_config().hermes_home
    log_dir = hermes_home / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    root_logger.handlers.clear()

    fmt = "%(asctime)s %(levelname)s %(name)s: %(message)s"

    file_handler = RotatingFileHandler(
        log_dir / "dashboard.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    root_logger.addHandler(file_handler)

    error_handler = RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=3,
    )
    error_handler.setLevel(logging.WARNING)
    error_handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    root_logger.addHandler(error_handler)

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(logging.INFO)
    console.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    root_logger.addHandler(console)


async def _global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger = logging.getLogger("dashboard")
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_config()
    _setup_logging(cfg.dashboard_log_level)
    logger = logging.getLogger(__name__)
    logger.info(
        "Hermes Dashboard starting — "
        f"hermes_home={cfg.hermes_home}, "
        f"gateway_admin={cfg.gateway_admin_url()}"
    )
    yield
    from services.sqlite_reader import close_connection
    close_connection()
    logger.info("Hermes Dashboard shutting down")


_dist = Path(__file__).parent.parent / "frontend" / "dist"


app = FastAPI(
    title="Hermes Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_exception_handler(Exception, _global_exception_handler)

# API routers first — these take /api/* before anything else
app.include_router(files.router)
app.include_router(sessions.router)
app.include_router(agents.router)

# CORS
cfg = get_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.frontend_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Health (no prefix)
app.add_api_route("/api/v1/health", lambda: {"status": "ok", "platform": "hermes-dashboard", "version": "1.0.0"})

# SPA catch-all — must be last so API routes resolve first
@app.get("/{path:path}")
async def spa_fallback(request: Request, path: str):
    """
    Serve index.html for any non-API path so React Router can handle the route.
    API paths are already handled by the routers above this catch-all.
    """
    if path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    # Serve the index.html from the dist directory
    index = _dist / "index.html"
    if index.exists():
        from fastapi.responses import FileResponse
        return FileResponse(str(index))
    return JSONResponse(status_code=404, content={"detail": "Dashboard frontend not found"})
