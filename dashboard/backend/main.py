"""FastAPI application — Hermes Dashboard Backend."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_config
from routers import files
from routers import agents
from routers import sessions

logger = logging.getLogger(__name__)

# silence uvicorn access log — we only log errors and important events
uvicorn_logger = logging.getLogger("uvicorn.access")
uvicorn_logger.setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_config()
    logger.info(
        "Hermes Dashboard starting — "
        f"hermes_home={cfg.hermes_home}, "
        f"gateway_admin={cfg.gateway_admin_url()}"
    )
    yield
    logger.info("Hermes Dashboard shutting down")


app = FastAPI(
    title="Hermes Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(files.router)

# CORS — same-origin in v1, disabled for simplicity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(sessions.router)
app.include_router(agents.router)

@app.get("/")
def root():
    return {"status": "ok", "platform": "hermes-dashboard"}


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "platform": "hermes-dashboard", "version": "1.0.0"}
