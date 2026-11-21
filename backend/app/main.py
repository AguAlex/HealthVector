import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, chat, leaflets, medications, schedules
from app.services.indexer_service import LeafletIndexerService


@asynccontextmanager
async def lifespan(app: FastAPI):
    started = time.perf_counter()
    try:
        await LeafletIndexerService.index_unindexed_leaflets()
    except Exception as exc:
        print(f"Leaflet indexing skipped or failed: {exc}")
    elapsed = time.perf_counter() - started
    print(f"Vector store init completed in {elapsed:.2f}s (NFR-07 target < 10s)")
    yield


app = FastAPI(
    title="Patient Medication Assistant Backend API",
    version="2.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leaflets.router)
app.include_router(medications.router)
app.include_router(schedules.router)
app.include_router(chat.router)
